import { treaty } from "@elysiajs/eden";
import { App } from "@/app/api/[[...slugs]]/route";

/**
 * Eden needs an absolute origin, so it cannot be hardcoded: in the browser the
 * API lives on whatever host is serving the page, and on the server there is no
 * relative URL to fall back on.
 */
const origin = () => {
  if (typeof window !== "undefined") return window.location.origin;

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

  // Vercel exposes the deployment host without a scheme.
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
};

// .api to enter /api prefix
export const apiClient = treaty<App>(origin()).api;

export const getApiClient = (headers?: Headers) => {
  return treaty<App>(origin(), { headers }).api;
};
