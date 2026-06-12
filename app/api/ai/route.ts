import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

import {
  AiValidationError,
  buildAiPrompt,
  parseAiRequestBody,
  resolveAiInstruction,
} from "@/lib/ai";

export async function POST(request: Request) {
  try {
    const payload = parseAiRequestBody(await request.json());
    const userApiKey = payload.apiKey?.trim();
    const session = await auth();
    if (!session?.user && !userApiKey) {
      return NextResponse.json(
        {
          error:
            "ログインするか、デモでは設定からGemini APIキーを登録してください。",
        },
        { status: 401 },
      );
    }

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini APIキーが未設定です。設定からキーを登録してください。",
        },
        { status: 400 },
      );
    }

    const instruction = resolveAiInstruction(
      payload.task,
      payload.customPrompt,
    );
    const prompt = buildAiPrompt({
      documentContent: payload.documentContent,
      instruction,
    });

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
    if (error instanceof AiValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("AI route error:", error);
    const message =
      error instanceof Error ? error.message : "AI処理に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
