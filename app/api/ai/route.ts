import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

const SYSTEM_PROMPT = `あなたはMarkdown編集の専門家です。
ユーザーの指示に従い、入力されたMarkdownを変換してください。
解説・前置き・コードフェンス（\`\`\`）は使わず、Markdown本文のみを出力してください。`;

const PRESET_PROMPTS: Record<string, string> = {
  summarize:
    "以下のMarkdown文書を3〜5行の要約（TL;DR）にまとめてください。見出しは「## 要約」から始めてください。",
  "noise-removal":
    "以下のMarkdownから、あいさつ・絵文字・AIチャットの定型文などのノイズを除去し、中身だけを残してください。構造（見出し・リスト）は維持してください。",
  promptify:
    "以下の内容を、再利用できるAI指示文テンプレートに変換してください。# 役割 / # 前提 / # 依頼 の3セクション構成にしてください。",
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { documentContent, task, customPrompt, apiKey: clientApiKey } = body;

    if (!documentContent || typeof documentContent !== "string") {
      return NextResponse.json(
        { error: "documentContent is required" },
        { status: 400 },
      );
    }

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini APIキーが未設定です。設定からキーを登録してください。",
        },
        { status: 400 },
      );
    }

    let userInstruction = "";
    if (task === "custom" && customPrompt?.trim()) {
      userInstruction = customPrompt.trim();
    } else if (task && PRESET_PROMPTS[task]) {
      userInstruction = PRESET_PROMPTS[task];
    } else {
      return NextResponse.json({ error: "有効なタスクを指定してください" }, { status: 400 });
    }

    const prompt = `${SYSTEM_PROMPT}\n\n【指示】\n${userInstruction}\n\n【対象Markdown】\n${documentContent}`;

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const result = response.text ?? "";
    if (!result.trim()) {
      return NextResponse.json(
        { error: "AIから空の応答が返されました" },
        { status: 500 },
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("AI route error:", error);
    const message =
      error instanceof Error ? error.message : "AI処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
