import { describe, expect, it } from "vitest";
import { formatWorkspaceDateTime } from "@/lib/workspace-date";

describe("formatWorkspaceDateTime", () => {
  it("サーバーとブラウザで揺れないようにワークスペース日付をJSTで整形する", () => {
    expect(formatWorkspaceDateTime("2026-06-17T10:55:00.000Z")).toBe(
      "2026/06/17 19:55",
    );
  });

  it("不正な日付は空文字で返す", () => {
    expect(formatWorkspaceDateTime("not-a-date")).toBe("");
  });
});
