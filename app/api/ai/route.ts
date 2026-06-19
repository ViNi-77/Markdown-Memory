import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";
import { generateText, gateway } from "ai";

import {
  AI_PROVIDERS,
  AiValidationError,
  DEFAULT_AI_PROVIDER,
  buildAiPrompt,
  buildGatewayProviderOptions,
  parseAiRequestBody,
  resolveAiInstruction,
  resolveAiModel,
  resolveAiProviderErrorResponse,
  resolveGeminiModel,
  type AiProviderId,
} from "@/lib/ai";
import {
  getRequestId,
  logError,
  logInfo,
  reportOperationalError,
} from "@/lib/monitoring";

async function generateWithDirectGemini(input: {
  apiKey: string;
  prompt: string;
}) {
  const ai = new GoogleGenAI({ apiKey: input.apiKey });
  const response = await ai.models.generateContent({
    model: resolveGeminiModel(),
    contents: input.prompt,
  });
  return response.text ?? "";
}

async function generateWithGateway(input: {
  provider: AiProviderId;
  model: string;
  prompt: string;
  apiKey?: string;
  userId?: string | null;
}) {
  const { text } = await generateText({
    model: gateway(input.model),
    prompt: input.prompt,
    providerOptions: {
      gateway: buildGatewayProviderOptions({
        provider: input.provider,
        apiKey: input.apiKey,
        userId: input.userId,
      }),
    },
  });
  return text;
}

export async function POST(request: Request) {
  const start = Date.now();
  const requestId = getRequestId(request);
  let provider: AiProviderId = DEFAULT_AI_PROVIDER;
  let model: string = AI_PROVIDERS[DEFAULT_AI_PROVIDER].defaultModel;
  let usesUserApiKey = false;
  let providerRequestStarted = false;
  try {
    const payload = parseAiRequestBody(await request.json());
    provider = payload.provider;
    model = resolveAiModel(provider);
    const userApiKey = payload.apiKey?.trim();
    usesUserApiKey = Boolean(userApiKey);
    const session = await auth();
    const userId = session?.user?.id ?? null;
    logInfo("ai.request.start", {
      route: "/api/ai",
      requestId,
      task: payload.task,
      provider,
      model,
      hasSession: Boolean(session?.user),
      usesUserApiKey,
    });

    if (!session?.user && !userApiKey) {
      logInfo("ai.request.rejected", {
        route: "/api/ai",
        requestId,
        provider,
        model,
        status: 401,
        ms: Date.now() - start,
      });
      return NextResponse.json(
        {
          error:
            "ログインするか、設定から選択中AIプロバイダーのAPIキーを登録してください。",
        },
        { status: 401 },
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

    const legacyGeminiApiKey =
      provider === "gemini" ? process.env.GEMINI_API_KEY?.trim() : undefined;
    const directGeminiApiKey =
      provider === "gemini" ? userApiKey || legacyGeminiApiKey : undefined;
    if (directGeminiApiKey) {
      model = resolveGeminiModel();
    }

    providerRequestStarted = true;
    const result = directGeminiApiKey
      ? await generateWithDirectGemini({
          apiKey: directGeminiApiKey,
          prompt,
        })
      : await generateWithGateway({
          provider,
          model,
          prompt,
          apiKey: userApiKey,
          userId,
        });

    if (!result.trim()) {
      logError("ai.request.empty_response", new Error("Empty AI response"), {
        route: "/api/ai",
        requestId,
        provider,
        model,
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
      provider,
      model,
      status: 200,
      ms: Date.now() - start,
    });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof AiValidationError) {
      logInfo("ai.request.validation_error", {
        route: "/api/ai",
        requestId,
        provider,
        model,
        status: 400,
        ms: Date.now() - start,
      });
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const providerError = providerRequestStarted
      ? resolveAiProviderErrorResponse(error, provider, usesUserApiKey)
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
      provider,
      model,
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
