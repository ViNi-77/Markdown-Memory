import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";

describe("db client configuration", () => {
  it("DATABASE_URL 未設定でも import は可能で、利用時に明示エラーを返す", () => {
    if (process.env.DATABASE_URL) return;

    expect(() => db.select()).toThrow("DATABASE_URL が未設定です");
  });
});
