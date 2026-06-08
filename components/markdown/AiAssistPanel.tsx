"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  Loader2,
  Settings,
  Replace,
  Plus,
  Copy,
  Check,
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
  onContentChange: (content: string) => void;
  onError: (message: string) => void;
};

export function AiAssistPanel({ document, onContentChange, onError }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem(API_KEY_STORAGE) ?? "");
  }, []);

  useEffect(() => {
    setResult("");
    setCustomPrompt("");
  }, [document.id]);

  function saveApiKey() {
    localStorage.setItem(API_KEY_STORAGE, apiKey.trim());
    setShowSettings(false);
  }

  async function runAi(task: string, prompt?: string) {
    const key = localStorage.getItem(API_KEY_STORAGE)?.trim();
    if (!key) {
      setShowSettings(true);
      onError("Gemini APIキーを設定してください。");
      return;
    }
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
          apiKey: key,
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
    await actions.updateDocumentContent(document.id, result);
    onContentChange(result);
    setResult("");
  }

  async function applyAppend() {
    if (!result) return;
    const newContent = document.content.trim()
      ? `${document.content.trim()}\n\n${result}`
      : result;
    await actions.updateDocumentContent(document.id, newContent);
    onContentChange(newContent);
    setResult("");
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
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5" />
          アプリ内AI
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          title="APIキー設定"
          onClick={() => setShowSettings((v) => !v)}
        >
          <Settings />
        </Button>
      </div>

      {showSettings && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3">
          <label className="text-xs text-muted-foreground">Gemini APIキー</label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            ブラウザにのみ保存されます。AI実行時だけサーバーに送られ、保存されません。
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
    </div>
  );
}
