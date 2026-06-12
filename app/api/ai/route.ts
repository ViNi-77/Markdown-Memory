import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

import {
  AiValidationError,
  buildAiPrompt,
  parseAiRequestBody,
  resolveAiInstruction,
} from "@/lib/ai";
import { getRequestId, logError, logInfo } from "@/lib/monitoring";

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestId(request);
  try {
    const payload = parseAiRequestBody(await request.json());
    const userApiKey = payload.apiKey?.trim();
    const session = await auth();
    logInfo("ai.request.start", {
      route: "/api/ai",
      requestId,
      task: payload.task,
      hasSession: Boolean(session?.user),
      usesUserApiKey: Boolean(userApiKey),
    });

    if (!session?.user && !userApiKey) {
      logInfo("ai.request.rejected", {
        route: "/api/ai",
        requestId,
        status: 401,
        ms: Date.now() - start,
      });
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
      logInfo("ai.request.rejected", {
        route: "/api/ai",
        requestId,
        status: 400,
        ms: Date.now() - start,
      });
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
      logError("ai.request.empty_response", new Error("Empty AI response"), {
        route: "/api/ai",
        requestId,
        status: 500,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        { error: "AIから空の応答が返されました" },
        { status: 500 },
      );
    }

    logInfo("ai.request.done", {
      route: "/api/ai",
      requestId,
      status: 200,
      ms: Date.now() - start,
    });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof AiValidationError) {
      logInfo("ai.request.validation_error", {
        route: "/api/ai",
        requestId,
        status: 400,
        ms: Date.now() - start,
      });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    logError("ai.request.failed", error, {
      route: "/api/ai",
      requestId,
      status: 500,
      ms: Date.now() - start,
    });
    return NextResponse.json(
      { error: "AI処理に失敗しました。時間をおいて再試行してください。" },
      { status: 500 },
    );
  }
}
