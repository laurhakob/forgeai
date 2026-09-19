import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import Elysia from "elysia";
import { z } from "zod";
import { clerk } from "./clerk";
import { requirePro } from "@/lib/pro-feature";
import { ensureSandbox, type SandboxBackup } from "@/lib/sandbox";

export const projects = new Elysia({ prefix: "/projects" })
  .use(clerk())
  .post(
    "/",
    async ({ auth, body, status }) => {
      const { userId } = auth();

      if (!userId) return status(401, { error: "Unauthorized" });

      if (body.imageUrl) {
        const denied = requirePro(auth, status, "screenshot_upload");
        if (denied) return denied;
      }

      const createdProject = await db.project.create({
        data: {
          name: `Project-${Date.now()}`,
          userId: userId as string,
          messages: {
            create: {
              content: body.message,
              role: "USER",
              type: "RESULT",
              imageUrl: body.imageUrl,
              userId: userId as string,
            },
          },
        },
      });

      await inngest.send({
        name: "code-agent/codeAgent.run",
        data: {
          message: body.message,
          projectId: createdProject.id,
          imageUrl: body.imageUrl,
          userId,
        },
      });

      return createdProject;
    },
    {
      body: z.object({
        message: z
          .string()
          .min(3, "Message is required")
          .max(1000, "Message is too long"),
        imageUrl: z.string().optional(),
      }),
    },
  )
  .get("/", async ({ auth, status }) => {
    const { userId } = auth();

    if (!userId) return status(401, { error: "Unauthorized" });

    const userProjects = await db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return userProjects;
  })
  // Quick-tunnel preview URLs die with the container, so the stored one on a
  // CodeFragment is only a historical record. The client asks for a live URL
  // here, which also wakes the sandbox and restores it from its last snapshot.
  .post(
    "/:projectId/preview",
    async ({ auth, params, status }) => {
      const { userId } = auth();

      if (!userId) return status(401, { error: "Unauthorized" });

      const project = await db.project.findFirst({
        where: { id: params.projectId, userId },
        select: { id: true, sandboxId: true, sandboxBackup: true },
      });

      if (!project) return status(404, { error: "Project not found" });
      if (!project.sandboxId) {
        return status(409, { error: "Project has no sandbox yet" });
      }

      const { url } = await ensureSandbox(project.sandboxId, {
        backup: project.sandboxBackup as SandboxBackup | null,
      });

      await db.project.update({
        where: { id: project.id },
        data: { sandboxUrl: url },
      });

      return { url };
    },
    {
      params: z.object({
        projectId: z.string().min(3, "Project Id is required"),
      }),
    },
  )
  .delete(
    "/:projectId",
    async ({ auth, params, status }) => {
      const { userId } = auth();

      if (!userId) return status(401, { error: "Unauthorized" });

      // Scope the delete to the owner so a valid session cannot remove
      // another user's project by guessing an id. Messages and their code
      // fragments cascade (see schema.prisma).
      const { count } = await db.project.deleteMany({
        where: { id: params.projectId, userId },
      });

      if (count === 0) return status(404, { error: "Project not found" });

      return { id: params.projectId };
    },
    {
      params: z.object({
        projectId: z.string().min(3, "Project Id is required"),
      }),
    },
  );