"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Settings,
  Replace,
  Plus,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import type { Document } from "@/lib/db/schema";
import * as actions from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import {
  AI_PROVIDER_KEY_STORAGE,
  AI_PROVIDER_OPTIONS,
  AI_PROVIDER_STORAGE,
  DEFAULT_AI_PROVIDER,
  LEGACY_GEMINI_API_KEY_STORAGE,
  isAiProviderId,
  resolveMigratedGeminiApiKey,
  type AiProviderId,
} from "@/lib/ai";

const PRESETS = [
  { id: "summarize", label: "要約 (TL;DR)" },
  { id: "noise-removal", label: "ノイズ除去" },
  { id: "promptify", label: "プロンプト化" },
] as const;

type Props = {
  document: Document;
  demoMode?: boolean;
  onContentChange: (content: string) => void;
  onError: (message: string) => void;
};

type ProviderApiKeys = Record<AiProviderId, string>;

function readStoredProvider(): AiProviderId {
  if (typeof window === "undefined") return DEFAULT_AI_PROVIDER;
  const stored = localStorage.getItem(AI_PROVIDER_STORAGE);
  return isAiProviderId(stored) ? stored : DEFAULT_AI_PROVIDER;
}

function readStoredApiKeys(): ProviderApiKeys {
  const emptyKeys: ProviderApiKeys = { claude: "", gpt: "", gemini: "" };
  if (typeof window === "undefined") return emptyKeys;

  const currentGeminiKey = localStorage.getItem(AI_PROVIDER_KEY_STORAGE.gemini);
  const legacyGeminiKey = localStorage.getItem(LEGACY_GEMINI_API_KEY_STORAGE);
  const migratedGeminiKey = resolveMigratedGeminiApiKey({
    currentGeminiKey,
    legacyGeminiKey,
  });

  if (!currentGeminiKey?.trim() && migratedGeminiKey) {
    localStorage.setItem(AI_PROVIDER_KEY_STORAGE.gemini, migratedGeminiKey);
    localStorage.removeItem(LEGACY_GEMINI_API_KEY_STORAGE);
  }

  return {
    claude: localStorage.getItem(AI_PROVIDER_KEY_STORAGE.claude) ?? "",
    gpt: localStorage.getItem(AI_PROVIDER_KEY_STORAGE.gpt) ?? "",
    gemini: migratedGeminiKey,
  };
}

export function AiAssistPanel({
  document,
  demoMode = false,
  onContentChange,
  onError,
}: Props) {
  const [provider, setProvider] = useState<AiProviderId>(readStoredProvider);
  const [apiKeys, setApiKeys] = useState<ProviderApiKeys>(readStoredApiKeys);
  const [showSettings, setShowSettings] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const selectedProvider =
    AI_PROVIDER_OPTIONS.find((option) => option.id === provider) ??
    AI_PROVIDER_OPTIONS[0];

  function saveApiKey() {
    const trimmed = apiKeys[provider].trim();
    const storageKey = AI_PROVIDER_KEY_STORAGE[provider];
    if (trimmed) {
      localStorage.setItem(storageKey, trimmed);
    } else {
      localStorage.removeItem(storageKey);
    }
    setApiKeys((current) => ({ ...current, [provider]: trimmed }));
    setShowSettings(false);
  }

  function handleProviderChange(value: string | null) {
    if (!isAiProviderId(value)) return;
    setProvider(value);
    setResult("");
    localStorage.setItem(AI_PROVIDER_STORAGE, value);
  }

  function updateApiKey(value: string) {
    setApiKeys((current) => ({ ...current, [provider]: value }));
  }

  async function runAi(task: string, prompt?: string) {
    const key = apiKeys[provider].trim();
    if (!document.content.trim()) {
      onError("本文が空です。AIに渡す内容がありません。");
      return;
    }

    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentContent: document.content,
          task,
          provider,
          customPrompt: prompt ?? customPrompt,
          ...(key ? { apiKey: key } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI処理に失敗しました");
      setResult(data.result);
    } catch (e) {
      onError(e instanceof Error ? e.message : "AI処理に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function applyReplace() {
    if (!result) return;
    if (demoMode) {
      onContentChange(result);
      setResult("");
      return;
    }
    setLoading(true);
    try {
      await actions.updateDocumentContent(document.id, result);
      onContentChange(result);
      setResult("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "本文の置き換えに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function applyAppend() {
    if (!result) return;
    const newContent = document.content.trim()
      ? `${document.content.trim()}\n\n${result}`
      : result;
    if (demoMode) {
      onContentChange(newContent);
      setResult("");
      return;
    }
    setLoading(true);
    try {
      await actions.updateDocumentContent(document.id, newContent);
      onContentChange(newContent);
      setResult("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "本文の追記に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onError("コピーに失敗しました");
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 sm:pt-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 flex-1 justify-between px-2"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((v) => !v)}
        >
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            アプリ内AI · {selectedProvider.label}
          </span>
          <ChevronDown
            className={`size-3.5 text-muted-foreground transition-transform ${panelOpen ? "rotate-180" : ""}`}
          />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          title="APIキー設定"
          onClick={() => {
            setPanelOpen(true);
            setShowSettings((v) => !v);
          }}
        >
          <Settings />
        </Button>
      </div>

      {panelOpen && (
        <>
          {showSettings && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/70 p-3">
              <label className="text-xs text-muted-foreground">
                AIプロバイダー
              </label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger
                  size="sm"
                  className="w-full"
                  aria-label="AIプロバイダー"
                >
                  <span
                    data-slot="select-value"
                    className="flex flex-1 items-center gap-1.5 text-left"
                  >
                    {selectedProvider.modeLabel}
                  </span>
                </SelectTrigger>
                <SelectContent align="start">
                  {AI_PROVIDER_OPTIONS.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.modeLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="text-xs text-muted-foreground">
                {selectedProvider.label} APIキー
              </label>
              <Input
                type="password"
                value={apiKeys[provider]}
                onChange={(e) => updateApiKey(e.target.value)}
                placeholder={selectedProvider.keyPlaceholder}
                className="font-mono text-xs"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {demoMode
                  ? "デモではブラウザに保存した選択中プロバイダーのキーだけを使います。キーはAI実行時だけサーバーに送られます。"
                  : "キーはブラウザにのみ保存され、AI実行時だけ選択中プロバイダー用のキーをサーバーに送ります。空欄ならAI Gatewayまたはサーバー側設定を使います。"}
              </p>
              <Button size="sm" onClick={saveApiKey}>
                保存
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="xs"
                disabled={loading}
                onClick={() => {
                  setCustomPrompt(
                    preset.id === "summarize"
                      ? "3〜5行で要約してください"
                      : preset.id === "noise-removal"
                        ? "あいさつや絵文字を削って中身だけ残してください"
                        : "再利用できる指示文テンプレに変換してください",
                  );
                  runAi(preset.id);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="自由指示（例: 見出しを整理して読みやすくして）"
            rows={2}
            className="text-xs"
          />
          <Button
            size="sm"
            disabled={loading || !customPrompt.trim()}
            onClick={() => runAi("custom", customPrompt)}
          >
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            AIで整形
          </Button>

          {loading && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              処理中...
            </p>
          )}

          {result && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/70 p-3 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">
                提案（適用するまで原文は変わりません）
              </span>
              <div className="max-h-48 overflow-y-auto text-sm">
                <MarkdownView content={result} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Button size="sm" variant="secondary" onClick={applyReplace}>
                  <Replace />
                  本文を置き換え
                </Button>
                <Button size="sm" variant="outline" onClick={applyAppend}>
                  <Plus />
                  末尾に追記
                </Button>
                <Button size="sm" variant="ghost" onClick={copyResult}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "コピーしました" : "コピー"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
