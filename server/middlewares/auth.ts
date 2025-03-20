import jwt from "@elysiajs/jwt";
import Elysia from "elysia";
import { config } from "../config";
import db from "../db";

export const auth = new Elysia()
  .use(jwt({
    name: "jwt",
    secret: config.jwt.secret!,
  }))
  .derive({ as: "global" }, async ({ jwt, headers, set }) => {
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      set.status = 401;
      return { isAuthenticated: false, userId: null };
    }

    const token = authHeader.split(" ")[1];
    const payload = await jwt.verify(token);

    if (!payload || !payload.sub) {
      set.status = 401;
      return { isAuthenticated: false, userId: null };
    }

    const [rows] = await db.query(
      "SELECT is_verified FROM users WHERE id = ?",
      [payload.sub],
    );

    const users = rows as { is_verified: boolean }[];

    if (!users.length || !users[0].is_verified) {
      set.status = 403;
      return { isAuthenticated: false, userId: null };
    }

    return { isAuthenticated: true, userId: payload.sub };
  });

export const isAuthenticated = new Elysia()
  .use(auth)
  .guard({
    beforeHandle: ({ isAuthenticated, set }) => {
      if (!isAuthenticated) {
        set.status = 401;
        return "Unauthorized";
      }
    },
  });
