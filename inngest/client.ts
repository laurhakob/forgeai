import { Inngest } from "inngest";
import { realtimeMiddleware } from "@inngest/realtime/middleware";

export const inngest = new Inngest({
  id: "code-agent",
  middleware: [realtimeMiddleware()],
  // Without this the SDK falls back to Inngest Cloud and `send()` throws
  // "401 Event key not found", since no INNGEST_EVENT_KEY is configured.
  isDev: process.env.NODE_ENV === "development",
});
