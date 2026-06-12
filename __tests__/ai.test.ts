import { describe, expect, it } from "vitest";
import {
  AI_PRESET_PROMPTS,
  buildAiPrompt,
  parseAiRequestBody,
  resolveAiInstruction,
} from "@/lib/ai";

describe("AI request helpers", () => {
  it("プリセットタスクを安全に解決する", () => {
    expect(resolveAiInstruction("summarize", undefined)).toBe(
      AI_PRESET_PROMPTS.summarize,
    );
    expect(resolveAiInstruction("noise-removal", undefined)).toBe(
      AI_PRESET_PROMPTS["noise-removal"],
    );
  });

  it("custom タスクは空の自由指示を拒否する", () => {
    expect(() => resolveAiInstruction("custom", "  ")).toThrow(
      "自由指示を入力してください",
    );
    expect(resolveAiInstruction("custom", " 見出しを整理 ")).toBe(
      "見出しを整理",
    );
  });

  it("必須入力と apiKey 型を検証する", () => {
    expect(() => parseAiRequestBody({ task: "summarize" })).toThrow(
      "documentContent is required",
    );
    expect(() =>
      parseAiRequestBody({
        documentContent: "# Memo",
        task: "summarize",
        apiKey: 123,
      }),
    ).toThrow("apiKey must be a string");

    expect(
      parseAiRequestBody({
        documentContent: "# Memo",
        task: "summarize",
        apiKey: "AIza-test",
      }),
    ).toEqual({
      documentContent: "# Memo",
      task: "summarize",
      customPrompt: undefined,
      apiKey: "AIza-test",
    });
  });

  it("Gemini に渡すプロンプトは本文のみの出力を明示する", () => {
    const prompt = buildAiPrompt({
      documentContent: "# Original",
      instruction: "要約してください",
    });

    expect(prompt).toContain("Markdown本文のみを出力してください");
    expect(prompt).toContain("【指示】\n要約してください");
    expect(prompt).toContain("【対象Markdown】\n# Original");
  });
});
