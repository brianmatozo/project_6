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

class UserService {
  static async getAllUsers() {
    const [users] = await db.query<RowDataPacket[]>("SELECT * FROM users");
    return users;
  }

  static async createUser(username: string, email: string) {
    const [result] = await db.query<ResultSetHeader>(
      "INSERT INTO users (username, email) VALUES (?, ?)",
      [username, email],
    );
    return result;
  }

  static async createFakeUsers(limit: number) {
    const disableKeys = "ALTER TABLE users DISABLE KEYS;";
    const disableFKChecks = "SET FOREIGN_KEY_CHECKS = 0;";
    const insertQuery =
      "INSERT INTO users (username, email, created_at) VALUES ?;";
    const enableFKChecks = "SET FOREIGN_KEY_CHECKS = 1;";
    const enableKeys = "ALTER TABLE users ENABLE KEYS;";

    const fullQuery =
      `${disableKeys} ${disableFKChecks} ${insertQuery} ${enableFKChecks} ${enableKeys}`;

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
    const [result] = await db.query<ResultSetHeader>(fullQuery, [values]);
    return result;
  }

  static async createFakeUsersInBatches(
    limit: number,
    batchSize: number = 1000,
  ) {
    const actualBatchSize = Math.min(batchSize, 10000);
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
        [values],
      );

      inserted += result.affectedRows;
    }

    return {
      inserted,
      totalBatches,
    };
  }
}

export const users = new Elysia({ prefix: "/api/users" })
  .get("/db", async () => {
    const users = await UserService.getAllUsers();
    return users;
  })
  .get("/createTables", async () => {
    try {
      await db.query<ResultSetHeader>(`
      CREATE TABLE IF NOT EXISTS tokens (
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
      return { message: "Tables created!" };
    } catch (error) {
      return { error: error.message };
    }
  })
  .post(
    "/db",
    async ({ body }) => {
      const { limit } = body;
      const result = await UserService.createFakeUsers(limit);
      return {
        inserted: result.affectedRows,
      };
    },
    {
      body: t.Object({
        limit: t.Number({ minimum: 1, maximum: 100 }),
      }),
    },
  )
  .post(
    "/db-batch",
    async ({ body }) => {
      const { limit, batchSize } = body;
      const { inserted, totalBatches } = await UserService
        .createFakeUsersInBatches(limit, batchSize);
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
    },
  )
  .post(
    "/create",
    async ({ body: { username, email } }) => {
      const result = await UserService.createUser(username, email);
      return {
        inserted: result.affectedRows,
      };
    },
    {
      body: t.Object({
        username: t.String(),
        email: t.String(),
      }),
    },
  );
