# forgeai-sandbox

The Cloudflare Worker that owns the code sandboxes, replacing E2B.

## Why a separate worker?

The Cloudflare Sandbox SDK is Workers-native: `getSandbox()` needs a Durable
Object + container binding, and there is no Node client. The Next.js app and the
Inngest functions run on Node, so they talk to this worker over a small
authenticated control API. `lib/sandbox.ts` in the app is the client for it and
keeps the same shape the E2B client had (`commands.run`, `files.write`,
`files.read`).

## Two things that differ from E2B

**Previews come from quick tunnels.** `exposePort()` hands out wildcard
subdomains and `.workers.dev` has no wildcard DNS, so `PREVIEW_MODE=tunnel`
runs `cloudflared` inside the container instead and returns a free
`https://<random>.trycloudflare.com` URL. Those URLs change every time the
container restarts, so nothing may cache them — the app asks
`POST /api/projects/:id/preview` for a fresh one. Set `PREVIEW_MODE=exposePort`
plus a wildcard custom domain to get stable URLs.

**Containers lose their filesystem when they idle out** (`sleepAfter` is 20m).
The project only survives as an R2 snapshot: the Inngest run calls `backup`
after each generation, and `ensure` restores that snapshot whenever it finds the
container cold. `tunnels.*` needs `transport: "rpc"`, which is why `getSandbox`
is always called with it.

Measured: a snapshot of the scaffold plus `node_modules` is ~270 MB and takes
~6s to create; a cold `ensure` that restores it, starts `next dev` and opens a
tunnel takes ~34s.

### A fresh tunnel is not resolvable for ~6 seconds

`tunnels.get()` returns the hostname before DNS has propagated (measured: ~6s to
first `200`, ~11s including tunnel setup). Pointing an iframe at it immediately
yields `DNS_PROBE_FINISHED_NXDOMAIN`, which the browser caches and never retries
— the same URL then works fine in a new tab moments later.

Two guards: `waitForPreview` in `lib/sandbox.ts` polls the URL server-side
before `ensureSandbox` returns it, and `waitUntilResolvable` in
`code-web-view.tsx` re-checks from the browser (a `no-cors` fetch, which rejects
on DNS failure) before mounting the iframe. The client check is the load-bearing
one: the server resolving a hostname says nothing about the viewer's resolver.

### "Tunnel recovery attempts were exhausted"

A tunnel record belongs to the sandbox runtime that created it. **Deploying this
worker gives every live sandbox a new runtime**, so any container that outlives
a deploy holds a record the SDK can no longer stop, and `tunnels.get()` fails
with this error on every subsequent call. It is not transient and it does not
clear itself.

`reset-tunnel` fixes it: it destroys the record and kills the orphaned
`cloudflared` that `destroy()` cannot reach. It must be a **separate request** —
the SDK keeps the poisoned state for the rest of the invocation, so retrying
`tunnels.get()` in the same request fails no matter what was cleaned up.
`ensureSandbox` in `lib/sandbox.ts` does this automatically: ensure → on a
tunnel error, reset-tunnel → ensure again.

> **Do not put a `/` in a backup exclude pattern.** `excludes` goes to
> mksquashfs, and `"node_modules/.cache"` silently prunes the whole
> `node_modules` tree — the archive drops to 225 KB and the restored sandbox has
> no dependencies, so `next dev` never binds its port and `ensure` hangs.
> Single-segment names like `".next"` are fine.

## Control API

All routes require `Authorization: Bearer $CONTROL_TOKEN`.

| Route                                | Body                                | Returns                                 |
| ------------------------------------ | ----------------------------------- | --------------------------------------- |
| `POST /control/sandboxes/:id/ensure` | `{ backup? }`                       | `{ sandboxId, url, cold }`              |
| `POST /control/sandboxes/:id/exec`   | `{ command, cwd?, env?, timeout? }` | `{ stdout, stderr, exitCode, success }` |
| `POST /control/sandboxes/:id/write`  | `{ files: [{ path, content }] }`    | `{ written }`                           |
| `POST /control/sandboxes/:id/read`   | `{ paths: string[] }`               | `{ files: [{ path, content }] }`        |
| `POST /control/sandboxes/:id/mkdir`  | `{ path }`                          | `{ ok }`                                |
| `POST /control/sandboxes/:id/reset-tunnel` | –                             | `{ ok }`                                |
| `POST /control/sandboxes/:id/backup` | `{ excludes?, gitignore? }`         | `{ backup }`                            |

`ensure` restores `backup` if the container came up cold, starts
`next dev --turbopack` in `/home/user/project` if it is not already running,
waits for port 3000, and returns the public preview URL. `backup` returns an
opaque handle to store on `Project.sandboxBackup` and hand back to `ensure`.

## One-time account setup

```bash
npx wrangler r2 bucket create forgeai-sandbox-backups   # already done
npx wrangler secret put CONTROL_TOKEN                   # must equal CLOUDFLARE_SANDBOX_TOKEN in the app's .env
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

The R2 credentials are **not** the Cloudflare API token. Create them in the
dashboard under R2 → Manage API Tokens with **Object Read & Write** on
`forgeai-sandbox-backups`; wrangler cannot mint them. Expired backups are not
garbage-collected automatically, so add an R2 lifecycle rule on the `backups/`
prefix.

## Local development

```bash
cp .dev.vars.example .dev.vars   # then set a real CONTROL_TOKEN
pnpm install
pnpm dev                          # http://localhost:8787
```

The first run builds the Docker image (`create-next-app` + `shadcn add --all`),
which takes several minutes. Docker must be running.

`LOCAL_BACKUPS=true` in `.dev.vars` is required locally — `wrangler dev` has no
presigned URLs or FUSE, so the SDK has to reach R2 through the binding.

In the app's `.env` set:

```
CLOUDFLARE_SANDBOX_URL=http://localhost:8787
CLOUDFLARE_SANDBOX_TOKEN=<same value as CONTROL_TOKEN>
```

## Deploying

Requires a **Workers Paid plan** (containers are not on the free tier).

```bash
pnpm deploy                       # or `pnpm sandbox:deploy` from the repo root
```

Then point the app at the deployed worker:

```
CLOUDFLARE_SANDBOX_URL=https://forgeai-sandbox.<your-subdomain>.workers.dev
```

## Changing the base image

The `FROM docker.io/cloudflare/sandbox:<version>` tag in the `Dockerfile` must
stay in lockstep with the `@cloudflare/sandbox` version in `package.json`.
