export class AiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiValidationError";
  }
}

const SYSTEM_PROMPT = `あなたはMarkdown編集の専門家です。
ユーザーの指示に従い、入力されたMarkdownを変換してください。
解説・前置き・コードフェンス（\`\`\`）は使わず、Markdown本文のみを出力してください。`;

export const AI_PRESET_PROMPTS = {
  summarize:
    "以下のMarkdown文書を3〜5行の要約（TL;DR）にまとめてください。見出しは「## 要約」から始めてください。",
  "noise-removal":
    "以下のMarkdownから、あいさつ・絵文字・AIチャットの定型文などのノイズを除去し、中身だけを残してください。構造（見出し・リスト）は維持してください。",
  promptify:
    "以下の内容を、再利用できるAI指示文テンプレートに変換してください。# 役割 / # 前提 / # 依頼 の3セクション構成にしてください。",
} as const;

export type AiTask = keyof typeof AI_PRESET_PROMPTS | "custom";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export type AiRequestPayload = {
  documentContent: string;
  task: AiTask;
  customPrompt?: string;
  apiKey?: string;
};

export type AiProviderErrorKind =
  | "auth_or_config"
  | "model_config"
  | "rate_limit"
  | "unknown";

export type AiProviderErrorResponse = {
  kind: AiProviderErrorKind;
  providerStatus: number | null;
  responseStatus: number;
  publicMessage: string;
};

export function resolveGeminiModel(model = process.env.GEMINI_MODEL): string {
  const trimmed = model?.trim();
  return trimmed || DEFAULT_GEMINI_MODEL;
}

export function resolveAiInstruction(
  task: unknown,
  customPrompt: unknown,
): string {
  if (task === "custom") {
    if (typeof customPrompt !== "string" || !customPrompt.trim()) {
      throw new AiValidationError("自由指示を入力してください");
    }
    return customPrompt.trim();
  }

  if (typeof task === "string" && task in AI_PRESET_PROMPTS) {
    return AI_PRESET_PROMPTS[task as keyof typeof AI_PRESET_PROMPTS];
  }

  throw new AiValidationError("有効なタスクを指定してください");
}

export function parseAiRequestBody(body: unknown): AiRequestPayload {
  if (!body || typeof body !== "object") {
    throw new AiValidationError("リクエスト本文が不正です");
  }

  const source = body as Record<string, unknown>;
  const { documentContent, task, customPrompt, apiKey } = source;

  if (typeof documentContent !== "string" || !documentContent.trim()) {
    throw new AiValidationError("documentContent is required");
  }

  if (apiKey !== undefined && typeof apiKey !== "string") {
    throw new AiValidationError("apiKey must be a string");
  }

  return {
    documentContent,
    task: task as AiTask,
    customPrompt: typeof customPrompt === "string" ? customPrompt : undefined,
    apiKey,
  };
}

export function buildAiPrompt(input: {
  documentContent: string;
  instruction: string;
}): string {
  return `${SYSTEM_PROMPT}\n\n【指示】\n${input.instruction}\n\n【対象Markdown】\n${input.documentContent}`;
}

function readProviderStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const source = error as {
    status?: unknown;
    code?: unknown;
    response?: { status?: unknown };
    error?: { code?: unknown };
  };

  const candidates = [
    source.status,
    source.code,
    source.response?.status,
    source.error?.code,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function readProviderMessage(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : "";
}

export function resolveAiProviderErrorResponse(
  error: unknown,
  usesUserApiKey: boolean,
): AiProviderErrorResponse {
  const providerStatus = readProviderStatus(error);
  const message = readProviderMessage(error);
  const hasAuthOrConfigMessage =
    message.includes("api key") ||
    message.includes("permission") ||
    message.includes("unauthorized") ||
    message.includes("forbidden");
  const isModelConfigError =
    providerStatus === 404 ||
    (message.includes("model") &&
      (message.includes("not found") ||
        message.includes("not_found") ||
        message.includes("not supported") ||
        message.includes("unsupported")));
  const isAuthOrConfigError =
    providerStatus === 401 ||
    providerStatus === 403 ||
    (providerStatus === 400 && hasAuthOrConfigMessage) ||
    hasAuthOrConfigMessage;
  const isRateLimitError =
    providerStatus === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource exhausted");

  if (isRateLimitError) {
    return {
      kind: "rate_limit",
      providerStatus,
      responseStatus: 429,
      publicMessage:
        "Gemini APIの利用上限に達している可能性があります。時間をおいて再試行するか、APIキーの利用状況を確認してください。",
    };
  }

  if (isModelConfigError) {
    return {
      kind: "model_config",
      providerStatus,
      responseStatus: 502,
      publicMessage:
        "サーバー側のGemini API設定でエラーが発生しています。管理者はGEMINI_API_KEYとモデル設定を確認してください。",
    };
  }

  if (isAuthOrConfigError) {
    return {
      kind: "auth_or_config",
      providerStatus,
      responseStatus: usesUserApiKey ? 400 : 502,
      publicMessage: usesUserApiKey
        ? "Gemini APIキーが無効、権限不足、または利用できない状態です。設定からキーを確認して保存し直してください。"
        : "サーバー側のGemini API設定でエラーが発生しています。管理者はGEMINI_API_KEYとモデル設定を確認してください。",
    };
  }

  return {
    kind: "unknown",
    providerStatus,
    responseStatus: 500,
    publicMessage: "AI処理に失敗しました。時間をおいて再試行してください。",
  };
}
