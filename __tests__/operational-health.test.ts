import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createPrivateHealthPayload,
  createPublicHealthPayload,
  summarizeOperationalStatus,
} from "@/lib/operational-health";

const ORIGINAL_ENV = process.env;
const FAKE_DATABASE_URL = [
  "postgres",
  "ql://user:pass@example.invalid/db",
].join("");

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

describe("operational health helpers", () => {
  beforeEach(resetEnv);
  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("公開ヘルスチェックには秘密値や設定有無を含めない", () => {
    process.env.DATABASE_URL = FAKE_DATABASE_URL;
    process.env.AUTH_GOOGLE_SECRET = "secret-value";

    const payload = createPublicHealthPayload();
    const serialized = JSON.stringify(payload);

    expect(payload).toMatchObject({
      status: "ok",
      service: "markdown-memory",
    });
    expect(serialized).not.toContain("postgresql://");
    expect(serialized).not.toContain("secret-value");
    expect(serialized).not.toContain("AUTH_GOOGLE_SECRET");
  });

  it("必須環境変数の不足だけを名前で返す", () => {
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;

    const payload = createPrivateHealthPayload();
    const summary = summarizeOperationalStatus(payload);

    expect(payload.status).toBe("degraded");
    expect(summary.missingRequiredChecks).toContain("database");
    expect(summary.missingRequiredChecks).toContain("auth_secret");
    expect(JSON.stringify(payload)).not.toContain("undefined");
  });

  it("必須値がそろっていればokになる", () => {
    process.env.DATABASE_URL = FAKE_DATABASE_URL;
    process.env.AUTH_SECRET = "auth-secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.NEXTAUTH_URL = "https://markdown-memory.vercel.app";

    const payload = createPrivateHealthPayload();

    expect(payload.status).toBe("ok");
    expect(payload.checks.filter((check) => check.required)).toHaveLength(5);
  });
});
