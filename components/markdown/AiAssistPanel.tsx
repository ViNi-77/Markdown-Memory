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
import { MarkdownView } from "@/components/markdown/MarkdownView";

const API_KEY_STORAGE = "markdown_memory_gemini_api_key";

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

export function AiAssistPanel({
  document,
  demoMode = false,
  onContentChange,
  onError,
}: Props) {
  const [apiKey, setApiKey] = useState(() =>
    typeof window === "undefined"
      ? ""
      : (localStorage.getItem(API_KEY_STORAGE) ?? ""),
  );
  const [showSettings, setShowSettings] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  function saveApiKey() {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
    setApiKey(trimmed);
    setShowSettings(false);
  }

  async function runAi(task: string, prompt?: string) {
    const key = localStorage.getItem(API_KEY_STORAGE)?.trim();
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
            アプリ内AI
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
            <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
              <label className="text-xs text-muted-foreground">
                Gemini APIキー
              </label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="font-mono text-xs"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {demoMode
                  ? "デモではブラウザに保存したキーだけを使います。入力したキーはAI実行時だけサーバーに送られます。"
                  : "空欄ならサーバー側の GEMINI_API_KEY を使います。入力したキーはブラウザにのみ保存され、AI実行時だけサーバーに送られます。"}
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
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
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
