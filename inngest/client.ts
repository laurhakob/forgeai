import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

export const isInngestDev = process.env.NODE_ENV === "development";

/**
 * Where the realtime websocket should connect. The browser cannot work this out
 * on its own — see `fetchRealtimeSubscriptionToken` — so it is resolved here,
 * on the server, and handed to the client with the subscription token.
 */
export const inngestApiBaseUrl = isInngestDev
  ? "http://localhost:8288"
  : "https://api.inngest.com";

export const inngest = new Inngest({
  id: "code-agent",
  middleware: [realtimeMiddleware()],
  // Without this the SDK falls back to Inngest Cloud and `send()` throws
  // "401 Event key not found", since no INNGEST_EVENT_KEY is configured.
  isDev: isInngestDev,
});
