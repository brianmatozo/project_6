import Elysia, { t } from "elysia";
import { z } from "zod";
import db from "../db";
import { faker } from "@faker-js/faker";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { config } from "dotenv";

config();

const userSchema = z.object({
  id: z.number().int().positive(),
  username: z.string().regex(/[A-Za-z]+/i),
  email: z.string().email(),
  password: z.string().regex(/[A-Za-z]+/i),
  created_at: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

const userCreationSchema = z.object({
  username: z.string().regex(/[A-Za-z]+/i),
  email: z.string().email(),
  password: z.string().regex(/[A-Za-z]+/i),
});

class UserService {
  static async getAllUsers() {
    const [users] = await db.query<RowDataPacket[]>("SELECT * FROM users");
    return users;
  }

  static async signUp(username: string, email: string, password: string) {
    const [result] = await db.query<ResultSetHeader>(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
      [username, email, password],
    );
    return result;
  }

  static async signIn(email: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM users WHERE email = ?",
      [email],
    );
    return rows.length > 0 ? rows[0] : null;
  }

  static async deleteUser(email: string) {
    const [result] = await db.query<ResultSetHeader>(
      "DELETE FROM users WHERE email = ?",
      [email],
    );
    return result;
  }
  // const disableKeys = "ALTER TABLE users DISABLE KEYS;";
  // const disableFKChecks = "SET FOREIGN_KEY_CHECKS = 0;";
  // const insertQuery =
  //   "INSERT INTO users (username, email, created_at) VALUES ?;";
  // const enableFKChecks = "SET FOREIGN_KEY_CHECKS = 1;";
  // const enableKeys = "ALTER TABLE users ENABLE KEYS;";
}

export const users = new Elysia({ prefix: "/api/users" })
  .get("/db", async () => {
    const users = await UserService.getAllUsers();
    return users;
  })
  .post("/signUp", async ({ body }) => {
    const { username, email, password } = body;
    const hash = await Bun.password.hash(password);
    const users = await UserService.signUp(username, email, hash);
    return { inserted: users.affectedRows };
  }, {
    body: t.Object({
      username: t.String(),
      email: t.String(),
      password: t.String(),
    }),
  })
  .post("/signIn", async ({ body }) => {
    const { email, password } = body;
    const user = await UserService.signIn(email);
    if (!user) {
      return { success: false, message: "Invalid Credentials" };
    }
    const valid = await Bun.password.verify(password, user.password_hash);
    if (!valid) {
      return { success: false, message: "Invalid Password" };
    }

    const hasher = new Bun.CryptoHasher(
      "sha256",
      process.env.TOKEN_SECRET,
    );
    hasher.update(password);
    const token = hasher.digest("base64");
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;

    const query = db.query<ResultSetHeader>(
      "INSERT INTO tokens (token, expires_at, user_id) VALUES (?, ?, ?)",
      [token, expiresAt, user.id],
    );

    return { success: true, message: "Signed in Correctly!" };
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })
  .delete("/delete", async ({ body }) => {
    const { email } = body;
    const result = await UserService.deleteUser(email);
    return { ...result };
  }, {
    body: t.Object({
      email: t.String(),
    }),
  });
