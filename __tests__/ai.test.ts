import { describe, expect, it } from "vitest";
import {
  AI_PRESET_PROMPTS,
  DEFAULT_GEMINI_MODEL,
  buildAiPrompt,
  parseAiRequestBody,
  resolveAiProviderErrorResponse,
  resolveAiInstruction,
  resolveGeminiModel,
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

  it("Gemini モデルは現行の安定モデルを既定値にする", () => {
    expect(DEFAULT_GEMINI_MODEL).toBe("gemini-3.5-flash");
    expect(resolveGeminiModel()).toBe(DEFAULT_GEMINI_MODEL);
    expect(resolveGeminiModel(" gemini-2.5-flash ")).toBe("gemini-2.5-flash");
  });

  it("BYOK の認証・権限エラーはキー確認を促す", () => {
    const error = Object.assign(new Error("API key not valid"), {
      status: 400,
    });

    expect(resolveAiProviderErrorResponse(error, true)).toEqual({
      kind: "auth_or_config",
      providerStatus: 400,
      responseStatus: 400,
      publicMessage:
        "Gemini APIキーが無効、権限不足、または利用できない状態です。設定からキーを確認して保存し直してください。",
    });
  });

  it("Gemini の payload 系 400 はキー案内にしない", () => {
    const error = Object.assign(new Error("Request contains invalid content"), {
      status: 400,
    });

    expect(resolveAiProviderErrorResponse(error, true)).toEqual({
      kind: "unknown",
      providerStatus: 400,
      responseStatus: 500,
      publicMessage: "AI処理に失敗しました。時間をおいて再試行してください。",
    });
  });

  it("サーバー側 Gemini 設定エラーは管理者向け案内にする", () => {
    const error = Object.assign(new Error("Permission denied"), {
      status: 403,
    });

    expect(resolveAiProviderErrorResponse(error, false)).toEqual({
      kind: "auth_or_config",
      providerStatus: 403,
      responseStatus: 502,
      publicMessage:
        "サーバー側のGemini API設定でエラーが発生しています。管理者はGEMINI_API_KEYとモデル設定を確認してください。",
    });
  });

  it("Gemini モデル未検出はモデル設定の案内にする", () => {
    const error = Object.assign(
      new Error("models/gemini-old is not found for API version v1beta"),
      { status: 404 },
    );

    expect(resolveAiProviderErrorResponse(error, true)).toEqual({
      kind: "model_config",
      providerStatus: 404,
      responseStatus: 502,
      publicMessage:
        "サーバー側のGemini API設定でエラーが発生しています。管理者はGEMINI_API_KEYとモデル設定を確認してください。",
    });
  });

  it("利用上限エラーは再試行と利用状況確認を促す", () => {
    const error = Object.assign(new Error("Resource exhausted"), {
      status: 429,
    });

    expect(resolveAiProviderErrorResponse(error, true)).toEqual({
      kind: "rate_limit",
      providerStatus: 429,
      responseStatus: 429,
      publicMessage:
        "Gemini APIの利用上限に達している可能性があります。時間をおいて再試行するか、APIキーの利用状況を確認してください。",
    });
  });

  it("分類できないプロバイダーエラーは汎用メッセージにする", () => {
    expect(
      resolveAiProviderErrorResponse(new Error("Unexpected"), true),
    ).toEqual({
      kind: "unknown",
      providerStatus: null,
      responseStatus: 500,
      publicMessage: "AI処理に失敗しました。時間をおいて再試行してください。",
    });
  });
});
