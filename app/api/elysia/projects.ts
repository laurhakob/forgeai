import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import Elysia from "elysia";
import { z } from "zod";
import { clerk } from "./clerk";
import { requirePro } from "@/lib/pro-feature";

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