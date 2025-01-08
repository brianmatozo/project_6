import Elysia, { t } from "elysia";
import { z } from "zod";
import db from "../db";
import { faker } from "@faker-js/faker";
import { ResultSetHeader, RowDataPacket } from "mysql2";

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
  .get("/db", async () => {
    const [users] = await db.query<RowDataPacket[]>("SELECT * FROM users");
    return users;
  })

  .post(
    "/db",
    async ({ body }) => {
      const { limit } = body;

      const fakeUsers = Array.from({ length: limit }, () => ({
        username: faker.internet.username(),
        email: faker.internet.email(),
        created_at: faker.date.anytime(),
      }));
      const values = fakeUsers.map((user) => [
        user.username,
        user.email,
        user.created_at,
      ]);
      const [result] = await db.query<ResultSetHeader>(
        "INSERT INTO users (username, email, created_at) VALUES ?",
        [values]
      );
      return {
        inserted: result.affectedRows,
      };
    },
    {
      body: t.Object({
        limit: t.Number({ minimum: 1, maximum: 100 }),
      }),
    }
  )

  .post(
    "/db-batch",
    async ({ body }) => {
      const { limit, batchSize } = body;

      const actualBatchSize = Math.min(batchSize || 1000, 10000);
      const totalBatches = Math.ceil(limit / actualBatchSize);

      let inserted = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const fakeUsers = Array.from({ length: actualBatchSize }, () => ({
          username: faker.internet.username(),
          email: faker.internet.email(),
        }));

        const values = fakeUsers.map((user) => [user.username, user.email]);

        const [result] = await db.query<ResultSetHeader>(
          "INSERT INTO users (username, email) VALUES ?",
          [values]
        );

        inserted += result.affectedRows;
      }

      return {
        inserted,
        message: `Inserted ${inserted} users in ${totalBatches} batches`,
      };
    },
    {
      body: t.Object({
        limit: t.Number({ minimum: 1, maximum: 10000000 }),
        batchSize: t.Optional(t.Number({ minimum: 1, maximum: 10000 })),
      }),
    }
  )

