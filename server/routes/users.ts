import Elysia, { t } from "elysia";
import { mockUsers } from "../data/users";
import { z } from "zod";

const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().regex(/[A-Za-z]+/i),
  email: z.string().email(),
  created_at: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

const userCreationSchema = z.object({
  username: z.string().regex(/[A-Za-z]+/i),
  email: z.string().email(),
});

export const users = new Elysia({ prefix: "/api/users" })
  .get(
    "/",
    ({ query: { limit } }) => {
      return mockUsers.slice(0, limit);
    },
    {
      query: t.Optional(
        t.Object({
          limit: t.Number(),
        })
      ),
    }
  )

  .get(
    "/:id",
    ({ params }) => {
      const id = Number(params.id);
      return mockUsers.find((user) => user.id === id);
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    }
  )

  .post(
    "/",
    ({ body }) => {
      if (!users) {
        throw new Error("User not found");
      }

      if (!userCreationSchema.safeParse(body).success) {
        throw new Error("Invalid user data");
      }
      const user = body as User;

      const lastId = mockUsers[mockUsers.length - 1].id;
      const id = lastId + 1;
      const createdAt = new Date().toISOString();
      const newUser = { ...user, id, created_at: createdAt };
      mockUsers.push(newUser);
      return newUser;
    },
    {
      body: t.Object({
        username: t.String(),
        email: t.String(),
      }),
    }
  )

  .put(
    "/:id",
    ({ params, body }) => {
      const id = params.id;
      const user = mockUsers.find((user) => user.id === id);
      if (!user) {
        throw new Error("User not found");
      }
      const updatedUser = userCreationSchema.parse(body);
      Object.assign(user, updatedUser);
      return user;
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
      body: t.Object({
        username: t.String(),
        email: t.String(),
      }),
    }
  )

  .delete(
    "/:id",
    ({ params }) => {
      const id = params.id;
      const user = mockUsers.find((user) => user.id === id);
      if (!user) {
        throw new Error("User not found");
      }
      mockUsers.splice(mockUsers.indexOf(user), 1);
      return user;
    },
    {
      params: t.Object({
        id: t.Number(),
      }),
    }
  )
  .get(
    "/id-count",
    () => {
      return { count: mockUsers.length };
    },
    {
      response: t.Object({
        count: t.Number(),
      }),
    }
  );
