import { ProjectView } from "@/components/project-view";
import { getApiClient } from "@/lib/api-client";
import { headers } from "next/headers";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const requestHeaders = await headers();

  const apiClient = getApiClient(requestHeaders);

  const { data, error } = await apiClient.messages.get({
    query: { projectId: id },
  });

  if (error) {
    console.error("Failed to load messages:", error.status, error.value);
  }

  // The route's inferred type includes `Response` because some branch returns a
  // raw Response. Only pass the messages array through.
  const initialMessages = Array.isArray(data) ? data : null;

  return <ProjectView projectId={id} initialMessages={initialMessages} />;
}