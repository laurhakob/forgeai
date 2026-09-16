import { clerkPlugin } from "elysia-clerk";

/**
 * `elysia-clerk` runs on `@clerk/backend`, which reads `CLERK_PUBLISHABLE_KEY`
 * and throws "Publishable key is missing" when it is unset — a 500 on every
 * route before any handler code runs. Next only exposes the key as
 * `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, so pass it through explicitly.
 */
export const clerk = () =>
  clerkPlugin({
    publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
