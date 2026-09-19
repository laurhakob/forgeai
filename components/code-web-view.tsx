import { CodeFragment } from "@/lib/generated/prisma/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { IconExternalLink, IconRefresh } from "@tabler/icons-react";
import { apiClient } from "@/lib/api-client";
import { IconLoader2 } from "@tabler/icons-react";

interface Props {
  data: CodeFragment;
  projectId: string;
}

interface SandboxUrlBarProps {
  sandboxBaseUrl: string;
  fullUrl: string;
  disabled: boolean;
  onNavigate: (path: string) => void;
}

/**
 * A quick-tunnel hostname is not resolvable for the first few seconds. Pointing
 * the iframe at it too early gives a DNS error page that the browser never
 * retries, so confirm *this* browser can reach it first — the server resolving
 * it says nothing about the client's resolver.
 *
 * `no-cors` means the response is opaque and unreadable, which is fine: the
 * request rejects on a DNS failure and resolves once the host answers, and that
 * is the only signal needed.
 */
async function waitUntilResolvable(url: string, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await fetch(url, {
        mode: "no-cors",
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });

      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  return false;
}

export function CodeWebView({ data, projectId }: Props) {
  const [fragmentKey, setFragmentKey] = useState(0);
  const [path, setPath] = useState<string>("/");
  // The fragment's stored URL is only a historical record: sandboxes idle out
  // and come back on a fresh quick-tunnel hostname, so the live one has to be
  // resolved from the server. Show the old one meanwhile so the bar is not
  // blank.
  const [baseUrl, setBaseUrl] = useState<string>(data.sandboxUrl ?? "");
  const [isWaking, setIsWaking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wake = useCallback(async () => {
    setIsWaking(true);
    setError(null);

    try {
      const { data: preview, error } = await apiClient
        .projects({ projectId })
        .preview.post();

      if (error) throw new Error(String(error.value));

      if (preview?.url) {
        await waitUntilResolvable(preview.url);
        setBaseUrl(preview.url);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsWaking(false);
    }
  }, [projectId]);

  useEffect(() => {
    void wake();
  }, [wake]);

  const fullUrl = useMemo(() => {
    if (!baseUrl) return "";

    const safePath = path.startsWith("/") ? path : `/${path}`;

    return `${baseUrl}${safePath}`;
  }, [baseUrl, path]);

  const canRender = Boolean(baseUrl) && !isWaking;

  return (
    <div className="flex flex-col w-full h-full">
      <div className="border-b bg-sidebar flex items-center gap-2 p-2">
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer"
          onClick={() => {
            void wake();
            setFragmentKey((prev) => prev + 1);
          }}
          disabled={isWaking}
        >
          {isWaking ? <IconLoader2 className="animate-spin" /> : <IconRefresh />}
        </Button>
        <SandboxUrlBar
          sandboxBaseUrl={baseUrl}
          fullUrl={fullUrl}
          onNavigate={(path) => setPath(path)}
          disabled={!canRender}
        />
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer"
          disabled={!canRender}
          onClick={() => {
            if (!baseUrl) return;
            window.open(baseUrl, "_blank");
          }}
        >
          <IconExternalLink />
        </Button>
      </div>
      {isWaking || !fullUrl ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          {error ? (
            <>
              <p>Could not start the sandbox.</p>
              <p className="max-w-md text-center text-xs">{error}</p>
            </>
          ) : (
            <>
              <IconLoader2 className="animate-spin" />
              {/* A cold start pays for container boot, snapshot restore and
                  `next dev`, so this can take a while. */}
              <p>Waking the sandbox...</p>
            </>
          )}
        </div>
      ) : (
        <iframe
          key={`${fragmentKey}:${fullUrl}`}
          className="h-full w-full"
          sandbox="allow-forms allow-scripts allow-same-origin"
          loading="lazy"
          src={fullUrl}
        />
      )}
    </div>
  );
}

export function SandboxUrlBar({
  sandboxBaseUrl,
  fullUrl,
  disabled,
  onNavigate,
}: SandboxUrlBarProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setDraft(fullUrl);
    setIsEditing(true);
  };

  const commit = () => {
    const raw = draft.trim();
    setIsEditing(false);

    const nextPath = raw.startsWith("/")
      ? raw
      : raw.startsWith(sandboxBaseUrl)
      ? raw.slice(sandboxBaseUrl.length) || "/"
      : `/${raw}`;
    const normalized = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
    onNavigate(normalized);
  };

  return (
    <div className="flex-1">
      {isEditing ? (
        <input
          ref={inputRef}
          autoFocus
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={startEditing}
          className="h-9 w-full truncate rounded-md border px-3 text-start text-sm font-normal hover:bg-muted
          disabled:cursor-not-allowed disabled:opacity-50
          "
        >
          {fullUrl || "-"}
        </button>
      )}
    </div>
  );
}