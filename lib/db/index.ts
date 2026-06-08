/**
 * Drizzle の DB クライアント。Neon（PostgreSQL）にHTTP経由で接続する。
 *
 * 接続文字列は環境変数 DATABASE_URL（Vercel の Neon 連携で自動発行される）。
 * Server Actions / Route Handlers から `import { db } from "@/lib/db"` で使う。
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL が未設定です。Vercel で Neon を追加し、.env.local に DATABASE_URL を設定してください。",
  );
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });

export { schema };
