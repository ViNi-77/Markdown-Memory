import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

import {
  AiValidationError,
  buildAiPrompt,
  parseAiRequestBody,
  resolveAiInstruction,
  resolveAiProviderErrorResponse,
  resolveGeminiModel,
} from "@/lib/ai";
import {
  getRequestId,
  logError,
  logInfo,
  reportOperationalError,
} from "@/lib/monitoring";

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestId(request);
  let usesUserApiKey = false;
  let providerRequestStarted = false;
  try {
    const payload = parseAiRequestBody(await request.json());
    const userApiKey = payload.apiKey?.trim();
    usesUserApiKey = Boolean(userApiKey);
    const session = await auth();
    logInfo("ai.request.start", {
      route: "/api/ai",
      requestId,
      task: payload.task,
      hasSession: Boolean(session?.user),
      usesUserApiKey,
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
    providerRequestStarted = true;
    const response = await ai.models.generateContent({
      model: resolveGeminiModel(),
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

    const providerError = providerRequestStarted
      ? resolveAiProviderErrorResponse(error, usesUserApiKey)
      : {
          kind: "unknown" as const,
          providerStatus: null,
          responseStatus: 500,
          publicMessage:
            "AI処理に失敗しました。時間をおいて再試行してください。",
        };
    await reportOperationalError("ai.request.failed", error, {
      route: "/api/ai",
      requestId,
      status: providerError.responseStatus,
      providerStatus: providerError.providerStatus,
      providerErrorKind: providerError.kind,
      providerRequestStarted,
      usesUserApiKey,
      ms: Date.now() - start,
    });
    return NextResponse.json(
      { error: providerError.publicMessage },
      { status: providerError.responseStatus },
    );
  }
}
