/**
 * 外部AIサービスへの「再投入」用定数。
 * 本文をクリップボードにコピーし、該当サービスを新規タブで開く（貼り付けはユーザー操作）。
 * ファイル自動添付は各サービスが非対応のため、この方式を採用している。
 */

export const AI_HANDOFF_SERVICES = [
  { id: "claude", label: "Claude", url: "https://claude.ai/new" },
  { id: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { id: "gemini", label: "Gemini", url: "https://gemini.google.com/app" },
] as const;

export type AiHandoffServiceId = (typeof AI_HANDOFF_SERVICES)[number]["id"];
