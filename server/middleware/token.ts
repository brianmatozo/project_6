import db from "../db";

const tokenMiddleware = async (context, next) => {
  const authHeader = context.request.headers.get("authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: no token provided" }),
      { status: 401 },
    );
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return new Response(
      JSON.stringify({ error: "Unauthorized: invalid token format" }),
      { status: 401 },
    );
  }

  const token = parts[1];
  const currentTimestamp = Math.floor(Date.now() / 1000);

  const [rows] = await db.query(
    "SELECT * FROM tokens WHERE token = ? AND expires_at > ?",
    [token, currentTimestamp],
  );

  if (!rows) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: token invalid or expired" }),
      { status: 401 },
    );
  }

  context.user = rows[0];

  return next();
};

export default tokenMiddleware;
