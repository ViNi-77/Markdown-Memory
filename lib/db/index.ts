/**
 * Drizzle の DB クライアント。Neon（PostgreSQL）にHTTP経由で接続する。
 *
 * 接続文字列は環境変数 DATABASE_URL（Vercel の Neon 連携で自動発行される）。
 * Server Actions / Route Handlers から `import { db } from "@/lib/db"` で使う。
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const MISSING_DATABASE_URL_MESSAGE =
  "DATABASE_URL が未設定です。Vercel で Neon を追加し、.env.local に DATABASE_URL を設定してください。";

function createMissingDatabaseClient(): ReturnType<typeof drizzle> {
  return new Proxy(
    {},
    {
      get(_target, property) {
        // Promise-like と誤判定されないよう `then` は undefined を返す。
        if (property === "then") return undefined;
        throw new Error(MISSING_DATABASE_URL_MESSAGE);
      },
    },
  ) as ReturnType<typeof drizzle>;
}

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

/**
 * DB 未設定の CI / build でも Route Handler の import だけで落ちないようにする。
 * 実際に DB 操作へ進んだ場合は、上の Proxy が明示的な設定エラーを投げる。
 */
export const db = sql
  ? drizzle(sql, { schema })
  : createMissingDatabaseClient();

export { schema };
