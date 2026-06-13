import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/health/route";

const ORIGINAL_ENV = process.env;
const FAKE_DATABASE_URL = [
  "postgres",
  "ql://user:pass@example.invalid/db",
].join("");

function request(secret?: string) {
  return new Request("https://markdown-memory.vercel.app/api/cron/health", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

function setRequiredEnv() {
  process.env.DATABASE_URL = FAKE_DATABASE_URL;
  process.env.AUTH_SECRET = "auth-secret";
  process.env.AUTH_GOOGLE_ID = "google-id";
  process.env.AUTH_GOOGLE_SECRET = "google-secret";
  process.env.NEXTAUTH_URL = "https://markdown-memory.vercel.app";
}

describe("cron health route", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = ORIGINAL_ENV;
  });

  it("CRON_SECRET未設定なら503を返す", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(request());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "degraded",
      error: "cron_secret_not_configured",
    });
  });

  it("Authorizationが違う場合は401を返す", async () => {
    process.env.CRON_SECRET = "expected";

    const response = await GET(request("wrong"));

    expect(response.status).toBe(401);
  });

  it("必須設定がそろっていれば200を返す", async () => {
    process.env.CRON_SECRET = "expected";
    setRequiredEnv();

    const response = await GET(request("expected"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(JSON.stringify(body)).not.toContain("auth-secret");
    expect(JSON.stringify(body)).not.toContain("postgresql://");
  });
});
