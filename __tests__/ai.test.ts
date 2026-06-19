import { describe, expect, it } from "vitest";
import {
  AI_PRESET_PROMPTS,
  DEFAULT_AI_MODELS,
  DEFAULT_AI_PROVIDER,
  DEFAULT_DIRECT_GEMINI_MODEL,
  DEFAULT_GEMINI_MODEL,
  buildAiPrompt,
  buildGatewayProviderOptions,
  parseAiRequestBody,
  resolveAiProviderErrorResponse,
  resolveAiInstruction,
  resolveAiModel,
  resolveGeminiModel,
  resolveMigratedGeminiApiKey,
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

  it("必須入力、apiKey型、providerを検証する", () => {
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
    expect(() =>
      parseAiRequestBody({
        documentContent: "# Memo",
        task: "summarize",
        provider: "unknown",
      }),
    ).toThrow("有効なAIプロバイダーを指定してください");

    expect(
      parseAiRequestBody({
        documentContent: "# Memo",
        task: "summarize",
        apiKey: "sk-test",
      }),
    ).toEqual({
      documentContent: "# Memo",
      task: "summarize",
      provider: DEFAULT_AI_PROVIDER,
      customPrompt: undefined,
      apiKey: "sk-test",
    });

    expect(
      parseAiRequestBody({
        documentContent: "# Memo",
        task: "summarize",
        provider: "gpt",
      }).provider,
    ).toBe("gpt");
  });

  it("AI Gatewayモデルをprovider別に解決する", () => {
    expect(DEFAULT_GEMINI_MODEL).toBe(DEFAULT_AI_MODELS.gemini);
    expect(resolveAiModel("claude", {})).toBe("anthropic/claude-sonnet-4.6");
    expect(resolveAiModel("gpt", { AI_MODEL_GPT: " openai/gpt-5.4 " })).toBe(
      "openai/gpt-5.4",
    );
    expect(
      resolveAiModel("gemini", { AI_MODEL_GEMINI: " google/gemini-3-flash " }),
    ).toBe("google/gemini-3-flash");
  });

  it("Gemini direct fallbackモデルはGoogle prefixを外す", () => {
    expect(DEFAULT_DIRECT_GEMINI_MODEL).toBe("gemini-2.5-flash");
    expect(resolveGeminiModel(" google/gemini-2.5-flash ")).toBe(
      "gemini-2.5-flash",
    );
    expect(resolveGeminiModel(" gemini-3.5-flash ")).toBe("gemini-3.5-flash");
  });

  it("Claude/GPT BYOK はGateway providerOptionsにだけ入る", () => {
    expect(
      buildGatewayProviderOptions({
        provider: "claude",
        apiKey: " sk-ant-secret ",
        userId: "user-1",
      }),
    ).toEqual({
      user: "user-1",
      tags: ["feature:ai-assist", "provider:claude"],
      byok: {
        anthropic: [{ apiKey: "sk-ant-secret" }],
      },
    });

    expect(
      buildGatewayProviderOptions({
        provider: "gpt",
        apiKey: "",
        userId: null,
      }),
    ).toEqual({
      tags: ["feature:ai-assist", "provider:gpt"],
    });
  });

  it("旧Gemini APIキーは新Gemini keyへ移行できる", () => {
    expect(
      resolveMigratedGeminiApiKey({
        currentGeminiKey: " AIza-current ",
        legacyGeminiKey: "AIza-legacy",
      }),
    ).toBe("AIza-current");
    expect(
      resolveMigratedGeminiApiKey({
        currentGeminiKey: "",
        legacyGeminiKey: " AIza-legacy ",
      }),
    ).toBe("AIza-legacy");
  });

  it("AI に渡すプロンプトは本文のみの出力を明示する", () => {
    const prompt = buildAiPrompt({
      documentContent: "# Original",
      instruction: "要約してください",
    });

    expect(prompt).toContain("Markdown本文のみを出力してください");
    expect(prompt).toContain("【指示】\n要約してください");
    expect(prompt).toContain("【対象Markdown】\n# Original");
  });

  it("BYOK の認証・権限エラーはprovider別キー確認を促す", () => {
    const error = Object.assign(new Error("API key not valid"), {
      status: 400,
    });

    const response = resolveAiProviderErrorResponse(error, "claude", true);
    expect(response).toMatchObject({
      kind: "auth_or_config",
      providerStatus: 400,
      responseStatus: 400,
    });
    expect(response.publicMessage).toContain("Claude APIキー");
  });

  it("AI Gateway認証不足はサーバー側設定の案内にする", () => {
    const error = Object.assign(new Error("Gateway authentication failed"), {
      statusCode: 401,
    });

    const response = resolveAiProviderErrorResponse(error, "gpt", true);
    expect(response).toMatchObject({
      kind: "auth_or_config",
      providerStatus: 401,
      responseStatus: 502,
    });
    expect(response.publicMessage).toContain("AI Gateway");
  });

  it("payload 系 400 はキー案内にしない", () => {
    const error = Object.assign(new Error("Request contains invalid content"), {
      status: 400,
    });

    expect(resolveAiProviderErrorResponse(error, "gemini", true)).toEqual({
      kind: "unknown",
      providerStatus: 400,
      responseStatus: 500,
      publicMessage: "AI処理に失敗しました。時間をおいて再試行してください。",
    });
  });

  it("モデル未検出はモデル設定の案内にする", () => {
    const error = Object.assign(
      new Error("models/gemini-old is not found for API version v1beta"),
      { status: 404 },
    );

    const response = resolveAiProviderErrorResponse(error, "gemini", true);
    expect(response).toMatchObject({
      kind: "model_config",
      providerStatus: 404,
      responseStatus: 502,
    });
    expect(response.publicMessage).toContain("Geminiモデル設定");
  });

  it("利用上限エラーは再試行と利用状況確認を促す", () => {
    const error = Object.assign(new Error("Resource exhausted"), {
      status: 429,
    });

    const response = resolveAiProviderErrorResponse(error, "gpt", true);
    expect(response).toMatchObject({
      kind: "rate_limit",
      providerStatus: 429,
      responseStatus: 429,
    });
    expect(response.publicMessage).toContain("GPT APIまたはAI Gateway");
  });

  it("分類できないプロバイダーエラーは汎用メッセージにする", () => {
    expect(
      resolveAiProviderErrorResponse(new Error("Unexpected"), "claude", true),
    ).toEqual({
      kind: "unknown",
      providerStatus: null,
      responseStatus: 500,
      publicMessage: "AI処理に失敗しました。時間をおいて再試行してください。",
    });
  });
});
