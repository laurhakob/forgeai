import path from "path";

export const PROJECTROOT = "/home/user/project";

/**
 * The Cloudflare Sandbox SDK only runs inside a Worker (it needs the Durable
 * Object + container binding), so this module talks to the companion worker in
 * `cloudflare-sandbox/` over its authenticated control API. The surface is kept
 * deliberately close to the old e2b client so callers barely changed.
 */

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

/**
 * Opaque handle returned by the worker's `backup` action. Stored verbatim on
 * `Project.sandboxBackup` and handed straight back to restore the project.
 */
export interface SandboxBackup {
  id: string;
  dir: string;
  localBucket?: boolean;
}

interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

function controlConfig() {
  const baseUrl = process.env.CLOUDFLARE_SANDBOX_URL;
  const token = process.env.CLOUDFLARE_SANDBOX_TOKEN;

  if (!baseUrl) throw new Error("Missing CLOUDFLARE_SANDBOX_URL");
  if (!token) throw new Error("Missing CLOUDFLARE_SANDBOX_TOKEN");

  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

async function control<T>(
  sandboxId: string,
  action: string,
  body?: unknown,
): Promise<T> {
  const { baseUrl, token } = controlConfig();

  const response = await fetch(
    `${baseUrl}/control/sandboxes/${encodeURIComponent(sandboxId)}/${action}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    },
  );

  const text = await response.text();

  if (!response.ok) {
    let message = text;
    try {
      message = (JSON.parse(text) as { error?: string }).error ?? text;
    } catch {
      // response was not JSON; fall back to the raw body
    }
    throw new Error(`Sandbox ${action} failed (${response.status}): ${message}`);
  }

  return JSON.parse(text) as T;
}

export class CloudflareSandbox {
  constructor(public readonly sandboxId: string) {}

  commands = {
    run: async (command: string, options: RunOptions = {}) => {
      const result = await control<CommandResult>(this.sandboxId, "exec", {
        command,
        cwd: options.cwd,
        env: options.env,
        timeout: options.timeout,
      });

      // The control API returns the full output once the command finishes, so
      // the callbacks fire a single time rather than incrementally.
      if (result.stdout) options.onStdout?.(result.stdout);
      if (result.stderr) options.onStderr?.(result.stderr);

      // Matches the old e2b behaviour of throwing on a non-zero exit.
      if (!result.success) {
        throw new Error(
          `Command exited with code ${result.exitCode}: ${result.stderr || result.stdout}`,
        );
      }

      return result;
    },
  };

  files = {
    write: async (filePath: string, content: string) => {
      await control(this.sandboxId, "write", {
        files: [{ path: toProjectPath(filePath), content }],
      });
    },

    read: async (filePath: string) => {
      const result = await control<{ files: { path: string; content: string }[] }>(
        this.sandboxId,
        "read",
        { paths: [toProjectPath(filePath)] },
      );

      return result.files[0]?.content ?? "";
    },

    makeDir: async (dirPath: string) => {
      await control(this.sandboxId, "mkdir", { path: toProjectPath(dirPath) });
    },
  };
}

/** Deterministic sandbox id for a project — Cloudflare sandboxes are addressed by name. */
export const sandboxIdForProject = (projectId: string) => `project-${projectId}`;

export async function getSandbox(sandboxId: string) {
  return new CloudflareSandbox(sandboxId);
}

/**
 * Wakes the sandbox, restores `backup` if the container came up cold, starts the
 * dev server and returns its public preview URL. Replaces the old
 * `Sandbox.create` / `Sandbox.connect` pair.
 *
 * Cloudflare containers lose their filesystem when they idle out, so this has to
 * run before any file or command operation — not just on first creation.
 */
export async function ensureSandbox(
  sandboxId: string,
  options: {
    backup?: SandboxBackup | null;
    /**
     * Opening the tunnel is the slowest and most failure-prone part of waking a
     * sandbox, so callers that only need to write files or run commands leave
     * this off and get back a null url.
     */
    url?: boolean;
  } = {},
) {
  const wantUrl = options.url ?? true;

  const body = { backup: options.backup ?? undefined, url: wantUrl };

  type EnsureResult = { sandboxId: string; url: string | null; cold: boolean };

  let result: EnsureResult;

  try {
    result = await control<EnsureResult>(sandboxId, "ensure", body);
  } catch (error) {
    if (!isTunnelFailure(error)) throw error;

    // A container that outlived a deploy of the sandbox worker holds a tunnel
    // the SDK can no longer manage. Clearing it only takes effect on the next
    // request, so the reset and the retry are deliberately separate calls.
    await control(sandboxId, "reset-tunnel");

    result = await control<EnsureResult>(sandboxId, "ensure", body);
  }

  if (result.url) await waitForPreview(result.url);

  return {
    sandbox: new CloudflareSandbox(sandboxId),
    url: result.url,
    cold: result.cold,
  };
}

const isTunnelFailure = (error: unknown) =>
  error instanceof Error && /tunnel/i.test(error.message);

/**
 * A freshly provisioned quick tunnel is handed back before its hostname is
 * resolvable — measured at roughly six seconds. Returning the URL that early
 * hands consumers a dead address, and a browser that hits it caches the DNS
 * failure rather than retrying, so wait for it to answer first.
 */
async function waitForPreview(url: string, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok || response.status < 500) return true;
    } catch {
      // Not resolvable yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  // Let the caller through anyway: a slow tunnel is better than a failed run,
  // and the browser does its own check before showing the preview.
  return false;
}

/** Snapshots the project directory to R2 and returns the handle to store. */
export async function createSandboxBackup(sandboxId: string) {
  const result = await control<{ backup: SandboxBackup }>(sandboxId, "backup");

  return result.backup;
}

export const toProjectPath = (p: string) => {
  const normalized = p.replace(/\\/g, "/").trim();
  if (normalized.startsWith("/")) return normalized;

  return path.posix.join(PROJECTROOT, normalized);
};
