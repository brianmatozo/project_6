import { jwt } from "@elysiajs/jwt";
import Elysia, { t } from "elysia";
import { config } from "../config";
import db from "../db";
import { sendValidationEmail } from "../lib/email";
import { isAuthenticated } from "../middlewares/auth";

export const generateValidationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const authRoutes = new Elysia()
  .use(
    jwt({
      name: "jwt",
      secret: config.jwt.secret!,
    }),
  )
  .post(
    "/register",
    async ({ body, set }) => {
      try {
        const hashedPassword = await Bun.password.hash(body.password, {
          algorithm: "bcrypt",
          cost: 10,
        });

        const [result] = await db.query(
          "INSERT INTO users (email, password, username) VALUES (?, ?, ?)",
          [body.email, hashedPassword, body.name],
        );

        const insertResult = result as { insertId: number };
        const userId = insertResult.insertId;

        const code = generateValidationCode();
        const expiresAt = new Date(
          Date.now() + config.validationCode.expiresIn,
        );

        await db.query(
          "INSERT INTO validation_codes (user_id, token, expires_at) VALUES (?, ?, ?)",
          [userId, code, expiresAt],
        );

        await sendValidationEmail(body.email, body.name, code);

        return {
          success: true,
          message:
            "User registered successfully, Please check your email for the validation code.",
        };
      } catch (error) {
        console.error("Registration error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Registration failed. Please try again later.",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
        name: t.String(),
      }),
    },
  )
  .post(
    "/verify",
    async ({ body, set }) => {
      try {
        const [userRows] = await db.query(
          "SELECT id, is_verified FROM users WHERE email = ?",
          [body.email],
        );

        const users = userRows as { id: number; is_verified: boolean }[];

        if (!users.length) {
          set.status = 404;
          return {
            success: false,
            message: "User not found",
          };
        }

        const user = users[0];

        if (user.is_verified) {
          return {
            success: true,
            message: "Email already verified",
          };
        }

        const [codeRows] = await db.query(
          "SELECT * FROM validation_codes WHERE user_id = ? AND token = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
          [user.id, body.code],
        );

        const codes = codeRows as any[];

        if (!codes.length) {
          set.status = 400;
          return {
            success: false,
            message: "Invalid or expired validation code",
          };
        }

        await db.query(
          "UPDATE users SET is_verified = TRUE WHERE id = ?",
          [user.id],
        );

        await db.query(
          "DELETE FROM validation_codes WHERE id = ?",
          [codes[0].id],
        );

        //const token = await authToken.sign({
        //  sub: user.id,
        //});

        return {
          success: true,
          message: "Email verified successfully",
          // token,
        };
      } catch (error) {
        console.error("Verification error: ", error);
        set.status = 500;
        return {
          success: false,
          message: "Verification failed. Please try again later.",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        code: t.String({ minLength: 6, maxLength: 6 }),
      }),
    },
  )
  .post(
    "/login",
    async ({ body, set, jwt, cookie: { authToken } }) => {
      try {
        const [rows] = await db.query(
          "SELECT id, password, email, is_verified FROM users WHERE email = ?",
          [body.email],
        );

        const users = rows as {
          id: number;
          password: string;
          email: string;
          is_verified: boolean;
        }[];

        if (!users.length) {
          set.status = 401;
          return {
            success: false,
            message: "Invalid email or password",
          };
        }

        const user = users[0];

        const isPasswordValid = await Bun.password.verify(
          body.password,
          user.password,
          "bcrypt",
        );

        if (!isPasswordValid) {
          set.status = 401;
          return {
            success: false,
            message: "Invalid email or password",
          };
        }

        if (!user.is_verified) {
          set.status = 403;
          return {
            success: false,
            message: "Email not verified. Please verify your email to login.",
          };
        }

        const token = await jwt.sign({
          sub: String(user.id),
          // 'sub' complains: type 'number' is not assignable to type 'string'
          email: user.email,
        });

        authToken.set({
          value: token,
          httpOnly: true,
          maxAge: 60 * 60 * 24,
          path: "/",
        });

        return {
          success: true,
          message: "Login successfully",
          token,
        };
      } catch (error) {
        console.error("Login error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Login failed. Please try again later.",
        };
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    },
  )
  .post(
    "/resend-code",
    async ({ body, set }) => {
      try {
        const [userRows] = await db.query(
          "SELECT id, username, is_verified FROM users WHERE email = ?",
          [body.email],
        );

        const users = userRows as {
          id: number;
          name: string;
          is_verified: boolean;
        }[];

        if (!users.length) {
          set.status = 404;
          return {
            success: false,
            message: "User not found",
          };
        }

        const user = users[0];

        if (user.is_verified) {
          return {
            success: true,
            message: "Email already verified",
          };
        }

        const code = generateValidationCode();
        const expiresAt = new Date(
          Date.now() + config.validationCode.expiresIn,
        );

        await db.query(
          "INSERT INTO validation_codes (user_id, token, expires_at) VALUES (?, ?, ?)",
          [user.id, code, expiresAt],
        );

        await sendValidationEmail(body.email, user.name, code);

        return {
          success: true,
          message: "Validation code sent. Please check your email.",
        };
      } catch (error) {
        console.error("Resend code error:", error);
        set.status = 500;
        return {
          success: false,
          message: "Failed to resend validation code. Please try again later.",
        };
      }
    },
    { body: t.Object({ email: t.String({ format: "email" }) }) },
  )
  .group("/protected", (app) =>
    app
      .use(isAuthenticated)
      .get("/profile", async ({ userId }) => {
        const [rows] = await db.query(
          "SELECT id, email, username, created_at FROM users WHERE id = ?",
          [userId],
        );
        const users = rows as any[];
        return {
          success: true,
          user: users[0],
        };
      }));
