"use server";

import { inngest, inngestApiBaseUrl } from "@/inngest/client";

import { projectChannel } from "@/inngest/functions";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { getSubscriptionToken, Realtime } from "@inngest/realtime";

export type ProjectChannelToken = Realtime.Token<
  typeof projectChannel,
  ["projectInfo"]
>;

export async function fetchRealtimeSubscriptionToken(
  projectId: string,
): Promise<ProjectChannelToken> {
  const { userId } = await auth();

  if (!userId) throw new Error("Unauthorized");

  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });

  if (!project) throw new Error("Forbidden");

  const token = await getSubscriptionToken(inngest, {
    channel: projectChannel(projectId),
    topics: ["projectInfo"] as const,
  });

  // @inngest/realtime@0.4.7 resolves the websocket host from its own env
  // helper, which is broken under Turbopack: it sees the `import.meta.env` shim
  // Next injects, takes that branch, and finds neither INNGEST_DEV nor NODE_ENV
  // there (Vite calls it MODE). Both come back undefined, so it assumes local
  // and connects to ws://localhost:8288 from every deployment.
  //
  // `app.apiBaseUrl` on the token is read before any of that, so resolving the
  // host here — on the server, where env vars actually work — is what makes the
  // subscription connect. `app` is undeclared on the Token type but is what the
  // subscribe helper reads, hence the cast.
  return { ...token, app: { apiBaseUrl: inngestApiBaseUrl } } as ProjectChannelToken;
}