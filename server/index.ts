import { Elysia } from "elysia";
import { users } from "./routes/users";
import { swagger } from "@elysiajs/swagger";
import staticPlugin from "@elysiajs/static";
import path from "path";
import cors from "@elysiajs/cors";

const distPath = path.resolve(__dirname, "../frontend/dist");

const app = new Elysia()
  .use(swagger())
  .use(cors())
  .use(
    staticPlugin({
      prefix: "/",
      assets: distPath,
      indexHTML: true,
    })
  )
  .use(users)
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
