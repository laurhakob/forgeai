import { treaty } from "@elysiajs/eden";
import { App } from "@/app/api/[[...slugs]]/route";

/**
 * The host the current request came in on. Preferred on the server because it
 * is the domain the user actually reached: it matches their session cookies,
 * and it avoids `VERCEL_URL`, which is the per-deployment domain that Vercel's
 * deployment protection answers with a 401 rather than the app.
 */
const originFromHeaders = (headers?: Headers) => {
  const host = headers?.get("x-forwarded-host") ?? headers?.get("host");

  if (!host) return null;

  const protocol =
    headers?.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`;
};

/**
 * Eden needs an absolute origin, so it cannot be hardcoded: in the browser the
 * API lives on whatever host is serving the page, and on the server there is no
 * relative URL to fall back on.
 */
const origin = () => {
  if (typeof window !== "undefined") return window.location.origin;

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

  // The stable production domain. Unlike VERCEL_URL it is not deployment
  // specific, so it is not behind deployment protection.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return `http://localhost:${process.env.PORT ?? 3000}`;
};

// .api to enter /api prefix
export const apiClient = treaty<App>(origin()).api;

export const getApiClient = (headers?: Headers) => {
  return treaty<App>(originFromHeaders(headers) ?? origin(), { headers }).api;
};
