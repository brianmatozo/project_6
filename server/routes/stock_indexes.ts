import Elysia, { t } from "elysia";
import db from "../db";
import { RowDataPacket } from "mysql2";
import { z } from "zod";

const symbolEnum = [
  "^BVSP",
  // "IBXX",
  // "^IBX50",
  // "^IEE",
  // "IFNC",
  // "^IGCX",
  // "INDX",
  // "ICON",
  // "IMAT",
  // "IMOB",
  // "UTIL",
  "^IVBX",
  // "SMLL",
  // "IFIX",
  // "IDIV",
  // "IBRA",
  // "MLCX",
  // "BDRX",
  // "ISEE",
  // "IGNM",
] as const;

const stockSchema = z.object({
  Date: z.string().date(),
  Symbol: z.enum(symbolEnum),
  Adj_Close: z.number(),
  Close: z.number(),
  High: z.number(),
  Low: z.number(),
  Open: z.number(),
  Volume: z.number(),
});

export type Stock = z.infer<typeof stockSchema>;

export const stock_idxes = new Elysia({ prefix: "/api/stock_idxes" }).post(
  "/db",
  async ({ body }) => {
    const { symbol, date } = body;
    const [users] = await db.query<RowDataPacket[]>(
      "SELECT * FROM stock_indexes WHERE Symbol = (?) AND Date >= (?)",
      [symbol, date]
    );
    return users as Stock[];
  },
  {
    body: t.Object({
      symbol: t.String(),
      date: t.Optional(t.String()),
    }),
  }
);
