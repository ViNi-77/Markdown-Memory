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

export type AiRequestPayload = {
  documentContent: string;
  task: AiTask;
  customPrompt?: string;
  apiKey?: string;
};

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
