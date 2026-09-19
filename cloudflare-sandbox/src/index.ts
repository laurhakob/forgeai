import {
  getSandbox,
  proxyToSandbox,
  type DirectoryBackup,
  type Sandbox as SandboxType,
} from "@cloudflare/sandbox";

export { Sandbox } from "@cloudflare/sandbox";

interface Env {
  Sandbox: DurableObjectNamespace<SandboxType>;
  CONTROL_TOKEN: string;
  PREVIEW_MODE?: string;
  PREVIEW_HOSTNAME?: string;
  /**
   * `wrangler dev` has no presigned URLs or FUSE, so backups there have to go
   * through the R2 binding directly.
   */
  LOCAL_BACKUPS?: string;
}

/** Where the scaffolded Next.js project lives inside the container. */
const PROJECT_ROOT = "/home/user/project";
/**
 * Port `next dev` listens on. Must match an EXPOSE line in the Dockerfile.
 * Not 3000 — the SDK reserves that for the container control server.
 */
const DEV_PORT = 3001;
/** Stable id for the long-running dev server process. */
const DEV_PROCESS_ID = "next-dev";
/**
 * Written once a sandbox is fully up. Its absence means the container came up
 * cold and lost its filesystem, so a backup needs restoring.
 *
 * Deliberately outside PROJECT_ROOT: that directory gets replaced wholesale by
 * the restore mount, so a marker inside it would come back from the snapshot
 * and make a cold container look warm.
 */
const READY_MARKER = "/tmp/.forgeai-ready";
const EXEC_TIMEOUT_MS = 10 * 60 * 1000;
/** Containers idle out and lose their filesystem after this long. */
const SLEEP_AFTER = "20m";
const BACKUP_TTL_SECONDS = 60 * 60 * 24 * 14;


const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const fail = (message: string, status = 500) => json({ error: message }, status);

/** `tunnels.*` is only available over the RPC transport. */
const sandboxFor = (env: Env, sandboxId: string) =>
  getSandbox(env.Sandbox, sandboxId, {
    transport: "rpc",
    sleepAfter: SLEEP_AFTER,
  });

/**
 * exposePort() preview URLs are wildcard subdomains of the worker's own host,
 * so the hostname has to come from the request unless it is pinned explicitly.
 */
const previewHostname = (request: Request, env: Env) =>
  env.PREVIEW_HOSTNAME?.trim() || new URL(request.url).hostname;

/**
 * Quick tunnels need no DNS setup but hand out a fresh hostname every time the
 * container restarts; exposePort() is stable but needs a wildcard custom
 * domain, which `.workers.dev` cannot provide.
 */
async function previewUrl(sandbox: SandboxType, request: Request, env: Env) {
  if (env.PREVIEW_MODE === "exposePort") {
    const exposed = await sandbox.exposePort(DEV_PORT, {
      hostname: previewHostname(request, env),
      name: "next-dev",
    });

    return exposed.url;
  }

  // Idempotent: returns the cached tunnel when one already exists for the port.
  //
  // A tunnel record is tied to the sandbox runtime that created it. Deploying a
  // new version of this worker gives every live sandbox a new runtime, so any
  // container that outlives a deploy holds a record the SDK can no longer stop,
  // and `tunnels.get()` then fails with "recovery attempts were exhausted" on
  // every call. `resetTunnel` clears that; see the `reset-tunnel` action for why
  // it has to happen in a separate request.
  const tunnel = await sandbox.tunnels.get(DEV_PORT);

  return tunnel.url;
}

/**
 * Clears a wedged tunnel so the next `ensure` can provision a fresh one.
 *
 * This deliberately does not retry `tunnels.get()` afterwards: the SDK keeps
 * poisoned tunnel state for the rest of the request, so a retry in the same
 * invocation fails no matter what was cleaned up. The caller has to come back
 * in a new request, which is what `ensureSandbox` in the app does.
 */
async function resetTunnel(sandbox: SandboxType) {
  await sandbox.tunnels.destroy(DEV_PORT).catch(() => {
    // Already gone, or never fully created.
  });

  // `destroy()` cannot stop a cloudflared belonging to a runtime that no longer
  // exists, and while that orphan is alive every provisioning attempt fails.
  await sandbox.exec("pkill -f cloudflared || true");
}

/**
 * Bring a sandbox up to a usable state: restore the project if the container is
 * cold, start `next dev` if it is not running, and return its public URL.
 * Safe to call repeatedly — this is the entry point every app request uses.
 */
async function ensureSandbox(
  sandbox: SandboxType,
  request: Request,
  env: Env,
  backup?: DirectoryBackup,
  // Provisioning a tunnel is the most failure-prone part of waking a sandbox,
  // so callers that only need the container running (writing files, running
  // commands) skip it rather than contending over the same tunnel record.
  wantUrl = true,
) {
  const marker = await sandbox.exec(`test -f ${READY_MARKER}`);
  const cold = !marker.success;

  // The image ships a pre-scaffolded project, so a missing backup just means
  // this is the project's first run.
  if (cold && backup) await sandbox.restoreBackup(backup);

  const processes = await sandbox.listProcesses();
  const running = processes.some(
    (process) => process.id === DEV_PROCESS_ID && process.status === "running",
  );

  if (!running) {
    const devServer = await sandbox.startProcess("npx next dev --turbopack", {
      cwd: PROJECT_ROOT,
      processId: DEV_PROCESS_ID,
      env: { PORT: String(DEV_PORT), NEXT_TELEMETRY_DISABLED: "1" },
    });

    await devServer.waitForPort(DEV_PORT);
  }

  const url = wantUrl ? await previewUrl(sandbox, request, env) : null;

  // Only now is the sandbox genuinely usable. Marking it earlier would strand a
  // half-restored container: every later call would skip the restore and the
  // dev server would keep failing to start.
  await sandbox.exec(`touch ${READY_MARKER}`);

  return { url, cold };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Must run first: preview-URL traffic is unauthenticated and is forwarded
    // straight into the container. Only used when PREVIEW_MODE is "exposePort".
    const proxied = await proxyToSandbox(request, env);
    if (proxied) return proxied;

    const url = new URL(request.url);

    if (url.pathname === "/health") return json({ ok: true });

    if (!url.pathname.startsWith("/control/")) {
      return fail("Not found", 404);
    }

    if (!env.CONTROL_TOKEN) {
      return fail("CONTROL_TOKEN is not configured on the worker", 500);
    }

    if (request.headers.get("authorization") !== `Bearer ${env.CONTROL_TOKEN}`) {
      return fail("Unauthorized", 401);
    }

    // /control/sandboxes/:sandboxId/:action
    const segments = url.pathname.split("/").filter(Boolean);
    const [, , sandboxId, action] = segments;

    if (segments[1] !== "sandboxes" || !sandboxId || !action) {
      return fail("Not found", 404);
    }

    const sandbox = sandboxFor(env, sandboxId);

    try {
      switch (action) {
        case "ensure": {
          const body = (await request.json().catch(() => ({}))) as {
            backup?: DirectoryBackup;
            url?: boolean;
          };

          const { url: previewUrl, cold } = await ensureSandbox(
            sandbox,
            request,
            env,
            body?.backup,
            body?.url ?? true,
          );

          return json({ sandboxId, url: previewUrl, cold });
        }

        case "exec": {
          const body = (await request.json()) as {
            command: string;
            cwd?: string;
            env?: Record<string, string>;
            timeout?: number;
          };

          if (!body?.command) return fail("`command` is required", 400);

          const result = await sandbox.exec(body.command, {
            cwd: body.cwd ?? PROJECT_ROOT,
            env: body.env,
            timeout: body.timeout ?? EXEC_TIMEOUT_MS,
          });

          return json({
            stdout: result.stdout ?? "",
            stderr: result.stderr ?? "",
            exitCode: result.exitCode ?? 0,
            success: result.success ?? result.exitCode === 0,
          });
        }

        case "write": {
          const body = (await request.json()) as {
            files: { path: string; content: string }[];
          };

          if (!Array.isArray(body?.files)) return fail("`files` is required", 400);

          for (const file of body.files) {
            const directory = file.path.slice(0, file.path.lastIndexOf("/"));
            if (directory) await sandbox.mkdir(directory, { recursive: true });
            await sandbox.writeFile(file.path, file.content);
          }

          return json({ written: body.files.map((file) => file.path) });
        }

        case "read": {
          const body = (await request.json()) as { paths: string[] };

          if (!Array.isArray(body?.paths)) return fail("`paths` is required", 400);

          const files: { path: string; content: string }[] = [];

          for (const path of body.paths) {
            const file = await sandbox.readFile(path, { encoding: "utf-8" });
            files.push({ path, content: String(file.content) });
          }

          return json({ files });
        }

        case "mkdir": {
          const body = (await request.json()) as { path: string };
          if (!body?.path) return fail("`path` is required", 400);

          await sandbox.mkdir(body.path, { recursive: true });
          return json({ ok: true });
        }

        case "reset-tunnel": {
          await resetTunnel(sandbox);

          return json({ ok: true });
        }

        case "backup": {
          const body = (await request.json().catch(() => ({}))) as {
            excludes?: string[];
            gitignore?: boolean;
          };

          // node_modules is deliberately kept so packages the agent installs
          // survive a restart. .next is rebuilt by `next dev` anyway.
          const backup = await sandbox.createBackup({
            dir: PROJECT_ROOT,
            compression: { format: "lz4" },
            ttl: BACKUP_TTL_SECONDS,
            excludes: body?.excludes ?? [".next"],
            gitignore: body?.gitignore ?? false,
            localBucket: env.LOCAL_BACKUPS === "true",
          });

          return json({ backup });
        }

        default:
          return fail("Not found", 404);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return fail(message, 500);
    }
  },
};
