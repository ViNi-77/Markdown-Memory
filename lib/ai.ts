import type { GatewayProviderOptions } from "@ai-sdk/gateway";

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

export const AI_PROVIDER_IDS = ["claude", "gpt", "gemini"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];
export const DEFAULT_AI_PROVIDER: AiProviderId = "claude";

export const DEFAULT_AI_MODELS = {
  claude: "anthropic/claude-sonnet-4.6",
  gpt: "openai/gpt-5-mini",
  gemini: "google/gemini-2.5-flash",
} as const satisfies Record<AiProviderId, string>;

export const DEFAULT_GEMINI_MODEL = DEFAULT_AI_MODELS.gemini;
export const DEFAULT_DIRECT_GEMINI_MODEL = "gemini-2.5-flash";

export const AI_PROVIDERS = {
  claude: {
    id: "claude",
    label: "Claude",
    modeLabel: "Claudeモード",
    gatewayProvider: "anthropic",
    modelEnvName: "AI_MODEL_CLAUDE",
    defaultModel: DEFAULT_AI_MODELS.claude,
    keyPlaceholder: "sk-ant-...",
  },
  gpt: {
    id: "gpt",
    label: "GPT",
    modeLabel: "GPTモード",
    gatewayProvider: "openai",
    modelEnvName: "AI_MODEL_GPT",
    defaultModel: DEFAULT_AI_MODELS.gpt,
    keyPlaceholder: "sk-...",
  },
  gemini: {
    id: "gemini",
    label: "Gemini",
    modeLabel: "Geminiモード",
    gatewayProvider: "google",
    modelEnvName: "AI_MODEL_GEMINI",
    defaultModel: DEFAULT_AI_MODELS.gemini,
    keyPlaceholder: "AIza...",
  },
} as const satisfies Record<
  AiProviderId,
  {
    id: AiProviderId;
    label: string;
    modeLabel: string;
    gatewayProvider: string;
    modelEnvName: string;
    defaultModel: string;
    keyPlaceholder: string;
  }
>;

export const AI_PROVIDER_OPTIONS = AI_PROVIDER_IDS.map((id) => ({
  id,
  label: AI_PROVIDERS[id].label,
  modeLabel: AI_PROVIDERS[id].modeLabel,
  keyPlaceholder: AI_PROVIDERS[id].keyPlaceholder,
}));

export const AI_PROVIDER_STORAGE = "markdown_memory_ai_provider";
export const LEGACY_GEMINI_API_KEY_STORAGE = "markdown_memory_gemini_api_key";
export const AI_PROVIDER_KEY_STORAGE = {
  claude: "markdown_memory_ai_key_claude",
  gpt: "markdown_memory_ai_key_gpt",
  gemini: "markdown_memory_ai_key_gemini",
} as const satisfies Record<AiProviderId, string>;

export type AiRequestPayload = {
  documentContent: string;
  task: AiTask;
  provider: AiProviderId;
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

export type AiGatewayProviderOptions = {
  user?: string;
  tags: string[];
  byok?: Record<string, { apiKey: string }[]>;
};

function readEnvValue(
  env: Record<string, string | undefined>,
  name: string,
): string | undefined {
  const trimmed = env[name]?.trim();
  return trimmed || undefined;
}

export function isAiProviderId(value: unknown): value is AiProviderId {
  return (
    typeof value === "string" && AI_PROVIDER_IDS.includes(value as AiProviderId)
  );
}

export function resolveAiProvider(provider: unknown): AiProviderId {
  if (provider === undefined || provider === null || provider === "") {
    return DEFAULT_AI_PROVIDER;
  }

  if (isAiProviderId(provider)) return provider;

  throw new AiValidationError("有効なAIプロバイダーを指定してください");
}

export function resolveAiModel(
  provider: AiProviderId,
  env: Record<string, string | undefined> = process.env,
): string {
  return (
    readEnvValue(env, AI_PROVIDERS[provider].modelEnvName) ??
    AI_PROVIDERS[provider].defaultModel
  );
}

export function resolveGeminiModel(
  model = process.env.GEMINI_MODEL ??
    process.env.AI_MODEL_GEMINI ??
    DEFAULT_DIRECT_GEMINI_MODEL,
): string {
  const trimmed = model?.trim();
  const selected = trimmed || DEFAULT_DIRECT_GEMINI_MODEL;
  return selected.startsWith("google/")
    ? selected.slice("google/".length)
    : selected;
}

export function resolveMigratedGeminiApiKey(input: {
  currentGeminiKey?: string | null;
  legacyGeminiKey?: string | null;
}): string {
  const current = input.currentGeminiKey?.trim();
  if (current) return current;

  return input.legacyGeminiKey?.trim() ?? "";
}

export function buildGatewayProviderOptions(input: {
  provider: AiProviderId;
  apiKey?: string;
  userId?: string | null;
}): AiGatewayProviderOptions {
  const apiKey = input.apiKey?.trim();
  const gatewayProvider = AI_PROVIDERS[input.provider].gatewayProvider;
  const options = {
    ...(input.userId ? { user: input.userId } : {}),
    tags: ["feature:ai-assist", `provider:${input.provider}`],
    ...(apiKey
      ? {
          byok: {
            [gatewayProvider]: [{ apiKey }],
          },
        }
      : {}),
  } satisfies AiGatewayProviderOptions;

  return options satisfies GatewayProviderOptions;
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
  const { documentContent, task, provider, customPrompt, apiKey } = source;

  if (typeof documentContent !== "string" || !documentContent.trim()) {
    throw new AiValidationError("本文が空です。AIに渡す内容がありません。");
  }

  if (apiKey !== undefined && typeof apiKey !== "string") {
    throw new AiValidationError("apiKey must be a string");
  }

  return {
    documentContent,
    task: task as AiTask,
    provider: resolveAiProvider(provider),
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
    statusCode?: unknown;
    code?: unknown;
    response?: { status?: unknown };
    error?: { code?: unknown };
  };

  const candidates = [
    source.status,
    source.statusCode,
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
  const messages: string[] = [];
  if (error instanceof Error) messages.push(error.message);

  if (error && typeof error === "object" && "cause" in error) {
    const cause = (error as { cause?: unknown }).cause;
    if (cause instanceof Error) messages.push(cause.message);
  }

  return messages.join(" ").toLowerCase();
}

export function resolveAiProviderErrorResponse(
  error: unknown,
  provider: AiProviderId,
  usesUserApiKey: boolean,
): AiProviderErrorResponse {
  const providerStatus = readProviderStatus(error);
  const message = readProviderMessage(error);
  const providerLabel = AI_PROVIDERS[provider].label;
  const isGatewayAuthError =
    message.includes("gateway") &&
    (message.includes("auth") ||
      message.includes("unauthorized") ||
      message.includes("forbidden") ||
      message.includes("api_gateway"));
  const hasAuthOrConfigMessage =
    message.includes("api key") ||
    message.includes("permission") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("authentication");
  const isModelConfigError =
    providerStatus === 404 ||
    (message.includes("model") &&
      (message.includes("not found") ||
        message.includes("not_found") ||
        message.includes("not supported") ||
        message.includes("unsupported")));
  const isAuthOrConfigError =
    providerStatus === 401 ||
    providerStatus === 402 ||
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
      publicMessage: `${providerLabel} APIまたはAI Gatewayの利用上限に達している可能性があります。時間をおいて再試行するか、APIキーの利用状況を確認してください。`,
    };
  }

  if (isModelConfigError) {
    return {
      kind: "model_config",
      providerStatus,
      responseStatus: 502,
      publicMessage: `サーバー側の${providerLabel}モデル設定でエラーが発生しています。管理者はAI Gatewayとモデル設定を確認してください。`,
    };
  }

  if (isAuthOrConfigError) {
    const shouldBlameUserKey = usesUserApiKey && !isGatewayAuthError;
    return {
      kind: "auth_or_config",
      providerStatus,
      responseStatus: shouldBlameUserKey ? 400 : 502,
      publicMessage: shouldBlameUserKey
        ? `${providerLabel} APIキーが無効、権限不足、または利用できない状態です。設定からキーを確認して保存し直してください。`
        : `AI Gatewayまたは${providerLabel}のサーバー側設定でエラーが発生しています。管理者はAI Gateway認証とモデル設定を確認してください。`,
    };
  }

  return {
    kind: "unknown",
    providerStatus,
    responseStatus: 500,
    publicMessage: "AI処理に失敗しました。時間をおいて再試行してください。",
  };
}
