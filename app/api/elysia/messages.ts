// import Elysia from "elysia";

// export const messages = new Elysia({ prefix: "/messages" }).get(
//   "/",
//   async () => {
//     return { messages: "Hello from Elysia js in Next" };
//   }
// ).post('/', async () => {
//   return {}
// })




import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import Elysia from "elysia";
import z from "zod";
// import { clerkPlugin } from "elysia-clerk";
// import { requirePro } from "@/lib/pro-feature";

export const messages = new Elysia({ prefix: "/messages" })
 // .use(clerkPlugin())
  .get(
    "/",
    async ({ query }) => {
    //  const { userId } = auth();

    //  if (!userId) return status(401, { error: "Unauthorized" });

      const messages = await db.message.findMany({
        where: { projectId: query.projectId },
        orderBy: { updatedAt: "asc" },
        include: { codeFragment: true },
      });

      return messages;
    },
    {
      query: z.object({
        projectId: z.string().min(3, "Project Id is required"),
      }),
    },
  )
  .post(
    "/",
    async ({ body }) => {
    //  const { userId } = auth();

     // if (!userId) return status(401, { error: "Unauthorized" });

      if (body.imageUrl) {
     //   await requirePro(auth, status, "screenshot_upload");
      }

      const createdMessage = await db.message.create({
        data: {
          content: body.message,
          role: "USER",
          type: "RESULT",
          projectId: body.projectId,
          imageUrl: body.imageUrl,
         // userId,
        },
      });

      await inngest.send({
        name: "code-agent/codeAgent.run",
        data: {
        //  userId,
          projectId: body.projectId,
          message: createdMessage.content,
          imageUrl: body.imageUrl,
        },
      });

      return createdMessage;
    },
    {
      body: z.object({
        message: z
          .string()
          .min(3, "Message is required")
          .max(1000, "Message is too long"),
        projectId: z.string().min(3, "Project Id is required"),
        imageUrl: z.string().optional(),
      }),
    },
  );