import Elysia from "elysia";

export const messages = new Elysia({ prefix: "/messages" }).get(
  "/",
  async () => {
    return { messages: "Hello from Elysia js in Next" };
  }
).post('/', async () => {
  return {}
})




