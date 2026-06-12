import { describe, expect, it } from "vitest";
import {
  createErrorReportPayload,
  redactSensitiveText,
} from "@/lib/monitoring";

describe("monitoring helpers", () => {
  it("エラー文字列からキーや接続URLを伏せる", () => {
    const geminiLikeKey = ["AIza", "123456789012345678901234567"].join("");
    const databaseUrl = [
      "postgres",
      "ql://user:pass@example.neon.tech/db",
    ].join("");

    const redacted = redactSensitiveText(
      `failed key=${geminiLikeKey} db=${databaseUrl} Bearer abc.def-ghi`,
    );

    expect(redacted).toContain("[REDACTED_GEMINI_KEY]");
    expect(redacted).toContain("[REDACTED_DATABASE_URL]");
    expect(redacted).toContain("Bearer [REDACTED_TOKEN]");
    expect(redacted).not.toContain("pass@example");
  });

  it("外部通知ペイロードに本文やstackを含めない", () => {
    const apiLikeKey = ["sk-", "abcdefghijklmnopqrstuvwxyz"].join("");

    const payload = createErrorReportPayload(
      "ai.request.failed",
      new Error(`provider failed with ${apiLikeKey}`),
      {
        route: "/api/ai",
        requestId: "request-1",
        status: 500,
        ms: 120,
      },
    );

    expect(payload).toMatchObject({
      service: "markdown-memory",
      event: "ai.request.failed",
      route: "/api/ai",
      requestId: "request-1",
      status: 500,
      ms: 120,
      errorName: "Error",
      errorMessage: "provider failed with [REDACTED_API_KEY]",
    });
    expect(payload).not.toHaveProperty("stack");
  });
});
