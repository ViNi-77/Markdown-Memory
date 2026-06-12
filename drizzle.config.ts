import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// マイグレーション実行（push/migrate）時に .env.local の DATABASE_URL を読む。
// スキーマ生成（generate）だけなら DATABASE_URL は不要。
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
