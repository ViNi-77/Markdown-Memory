"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  History,
  KeyRound,
  Loader2,
  Plus,
  Replace,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Document } from "@/lib/db/schema";
import * as actions from "@/lib/actions";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_PROVIDER_KEY_STORAGE,
  AI_PROVIDER_OPTIONS,
  AI_PROVIDER_STORAGE,
  DEFAULT_AI_PROVIDER,
  LEGACY_GEMINI_API_KEY_STORAGE,
  isAiProviderId,
  resolveMigratedGeminiApiKey,
  type AiProviderId,
  type AiTask,
} from "@/lib/ai";

const PRESETS = [
  {
    id: "summarize",
    label: "要約",
    description: "3〜5行のTL;DRを作成",
    prompt: "3〜5行で要約してください",
  },
  {
    id: "noise-removal",
    label: "ノイズ除去",
    description: "挨拶や定型文を削って本文を整理",
    prompt: "あいさつや絵文字を削って中身だけ残してください",
  },
  {
    id: "promptify",
    label: "プロンプト化",
    description: "再利用できる指示文テンプレートへ変換",
    prompt: "再利用できる指示文テンプレに変換してください",
  },
] as const satisfies ReadonlyArray<{
  id: Exclude<AiTask, "custom">;
  label: string;
  description: string;
  prompt: string;
}>;

type Props = {
  document: Document;
  demoMode?: boolean;
  onContentChange: (content: string) => void;
  onError: (message: string) => void;
};

type ProviderApiKeys = Record<AiProviderId, string>;

type AiHistoryItem = {
  id: string;
  taskLabel: string;
  providerLabel: string;
  content: string;
};

const MAX_AI_HISTORY_ITEMS = 5;
const EMPTY_API_KEYS: ProviderApiKeys = { claude: "", gpt: "", gemini: "" };

function readStoredProvider(): AiProviderId {
  if (typeof window === "undefined") return DEFAULT_AI_PROVIDER;
  const stored = localStorage.getItem(AI_PROVIDER_STORAGE);
  return isAiProviderId(stored) ? stored : DEFAULT_AI_PROVIDER;
}

function readStoredApiKeys(): ProviderApiKeys {
  if (typeof window === "undefined") return EMPTY_API_KEYS;

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

function redactUserVisibleAiText(value: string): string {
  return value
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[REDACTED_GEMINI_KEY]")
    .replace(/sk-[0-9A-Za-z_-]{20,}/g, "[REDACTED_API_KEY]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/Bearer\s+[0-9A-Za-z._-]+/gi, "Bearer [REDACTED_TOKEN]");
}

function createHistoryItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function resolveTaskLabel(task: AiTask): string {
  if (task === "custom") return "自由指示";
  return PRESETS.find((preset) => preset.id === task)?.label ?? "AI提案";
}

function getHistoryPreview(content: string): string {
  const preview = content.replace(/\s+/g, " ").trim();
  return preview.length > 96 ? `${preview.slice(0, 96)}...` : preview;
}

export function AiAssistPanel({
  document,
  demoMode = false,
  onContentChange,
  onError,
}: Props) {
  const [provider, setProvider] = useState<AiProviderId>(DEFAULT_AI_PROVIDER);
  const [apiKeys, setApiKeys] = useState<ProviderApiKeys>(EMPTY_API_KEYS);
  const [savedApiKeys, setSavedApiKeys] =
    useState<ProviderApiKeys>(EMPTY_API_KEYS);
  const [showSettings, setShowSettings] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<AiHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const selectedProvider =
    AI_PROVIDER_OPTIONS.find((option) => option.id === provider) ??
    AI_PROVIDER_OPTIONS[0];
  const providerInputId = `ai-provider-key-${provider}`;
  const selectedDraftKey = apiKeys[provider].trim();
  const selectedSavedKey = savedApiKeys[provider].trim();
  const hasSavedKey = Boolean(selectedSavedKey);
  const hasUnsavedKeyChange = selectedDraftKey !== selectedSavedKey;
  const documentHasContent = Boolean(document.content.trim());
  const canRunPreset = documentHasContent && !loading;
  const canRunCustom = canRunPreset && Boolean(customPrompt.trim());

  useEffect(() => {
    const restoreStoredPreferences = window.setTimeout(() => {
      const restoredKeys = readStoredApiKeys();
      setProvider(readStoredProvider());
      setApiKeys(restoredKeys);
      setSavedApiKeys(restoredKeys);
    }, 0);
    return () => window.clearTimeout(restoreStoredPreferences);
  }, []);

  function reportPanelError(message: string) {
    const redacted = redactUserVisibleAiText(message);
    setLocalError(redacted);
    onError(redacted);
  }

  function saveApiKey() {
    if (!selectedDraftKey) return;

    const storageKey = AI_PROVIDER_KEY_STORAGE[provider];
    localStorage.setItem(storageKey, selectedDraftKey);
    setApiKeys((current) => ({ ...current, [provider]: selectedDraftKey }));
    setSavedApiKeys((current) => ({
      ...current,
      [provider]: selectedDraftKey,
    }));
    setLocalError(null);
    setStatusMessage(`${selectedProvider.label} APIキーを保存しました。`);
  }

  function deleteApiKey() {
    const storageKey = AI_PROVIDER_KEY_STORAGE[provider];
    localStorage.removeItem(storageKey);
    setApiKeys((current) => ({ ...current, [provider]: "" }));
    setSavedApiKeys((current) => ({ ...current, [provider]: "" }));
    setLocalError(null);
    setStatusMessage(`${selectedProvider.label} APIキーを削除しました。`);
  }

  function handleProviderChange(value: string | null) {
    if (!isAiProviderId(value)) return;
    setProvider(value);
    setResult("");
    setActiveHistoryId(null);
    setLocalError(null);
    setStatusMessage(null);
    localStorage.setItem(AI_PROVIDER_STORAGE, value);
  }

  function updateApiKey(value: string) {
    setApiKeys((current) => ({ ...current, [provider]: value }));
    setStatusMessage(null);
  }

  async function runAi(task: AiTask, prompt?: string) {
    const key = savedApiKeys[provider].trim();
    if (!documentHasContent) {
      reportPanelError("本文が空です。AIに渡す内容がありません。");
      return;
    }

    setLoading(true);
    setResult("");
    setLocalError(null);
    setStatusMessage(null);
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
      const data = (await res.json().catch(() => ({}))) as {
        error?: unknown;
        result?: unknown;
      };
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "AI処理に失敗しました",
        );
      }
      if (typeof data.result !== "string" || !data.result.trim()) {
        throw new Error("AIから空の応答が返されました");
      }
      const historyItem: AiHistoryItem = {
        id: createHistoryItemId(),
        taskLabel: resolveTaskLabel(task),
        providerLabel: selectedProvider.label,
        content: data.result,
      };
      setResult(data.result);
      setActiveHistoryId(historyItem.id);
      setHistoryItems((current) =>
        [historyItem, ...current].slice(0, MAX_AI_HISTORY_ITEMS),
      );
      setStatusMessage(`${selectedProvider.label}から提案が返りました。`);
    } catch (e) {
      reportPanelError(e instanceof Error ? e.message : "AI処理に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function applyReplace() {
    if (!result) return;
    setReplaceConfirmOpen(false);
    if (demoMode) {
      onContentChange(result);
      setResult("");
      setActiveHistoryId(null);
      setStatusMessage("本文を置き換えました。");
      return;
    }
    setLoading(true);
    setLocalError(null);
    try {
      await actions.updateDocumentContent(document.id, result);
      onContentChange(result);
      setResult("");
      setActiveHistoryId(null);
      setStatusMessage("本文を置き換えました。");
    } catch (e) {
      reportPanelError(
        e instanceof Error ? e.message : "本文の置き換えに失敗しました",
      );
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
      setActiveHistoryId(null);
      setStatusMessage("末尾に追記しました。");
      return;
    }
    setLoading(true);
    setLocalError(null);
    try {
      await actions.updateDocumentContent(document.id, newContent);
      onContentChange(newContent);
      setResult("");
      setActiveHistoryId(null);
      setStatusMessage("末尾に追記しました。");
    } catch (e) {
      reportPanelError(
        e instanceof Error ? e.message : "本文の追記に失敗しました",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setStatusMessage("提案をコピーしました。");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      reportPanelError("コピーに失敗しました");
    }
  }

  function restoreHistoryItem(item: AiHistoryItem) {
    setResult(item.content);
    setActiveHistoryId(item.id);
    setLocalError(null);
    setStatusMessage(`${item.taskLabel}の提案を表示しました。`);
  }

  function clearHistory() {
    setHistoryItems([]);
    setActiveHistoryId(null);
    setStatusMessage("一時履歴をクリアしました。");
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 sm:pt-4">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 min-w-0 flex-1 justify-between px-2"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((v) => !v)}
        >
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" />
            <span className="truncate">
              アプリ内AI · {selectedProvider.label}
            </span>
          </span>
          <ChevronDown
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${panelOpen ? "rotate-180" : ""}`}
          />
        </Button>
        <Button
          variant={showSettings ? "secondary" : "ghost"}
          size="icon-xs"
          title="APIキー設定"
          aria-label="APIキー設定"
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
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{selectedProvider.modeLabel}</Badge>
            <Badge variant={hasSavedKey ? "outline" : "ghost"}>
              <KeyRound />
              {hasSavedKey ? "キー保存済み" : "キー未保存"}
            </Badge>
            {hasUnsavedKeyChange && (
              <Badge variant="outline">未保存の変更</Badge>
            )}
          </div>

          {showSettings && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas/70 p-3 shadow-2xs">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  アプリ内AIプロバイダー
                </Label>
                <Select value={provider} onValueChange={handleProviderChange}>
                  <SelectTrigger
                    size="sm"
                    className="w-full"
                    aria-label="アプリ内AIプロバイダー"
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
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor={providerInputId}
                    className="text-xs text-muted-foreground"
                  >
                    {selectedProvider.label} APIキー
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {hasSavedKey ? "保存済み" : "未保存"}
                  </span>
                </div>
                <Input
                  id={providerInputId}
                  type="password"
                  value={apiKeys[provider]}
                  onChange={(e) => updateApiKey(e.target.value)}
                  placeholder={selectedProvider.keyPlaceholder}
                  className="font-mono text-xs"
                />
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {demoMode
                  ? "デモではブラウザに保存した選択中プロバイダーのキーだけを使います。"
                  : "キーはブラウザにのみ保存され、AI実行時だけ送信されます。空欄ならAI Gatewayまたはサーバー側設定を使います。"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  onClick={saveApiKey}
                  disabled={!selectedDraftKey || !hasUnsavedKeyChange}
                >
                  <ShieldCheck />
                  キーを保存
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={deleteApiKey}
                  disabled={!hasSavedKey && !selectedDraftKey}
                >
                  <Trash2 />
                  キーを削除
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                className="h-auto min-h-12 w-full flex-col items-start justify-start gap-0.5 px-2.5 py-2 text-left whitespace-normal"
                disabled={!canRunPreset}
                onClick={() => {
                  setCustomPrompt(preset.prompt);
                  runAi(preset.id);
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles />
                  {preset.label}
                </span>
                <span className="text-xs leading-snug font-normal text-muted-foreground">
                  {preset.description}
                </span>
              </Button>
            ))}
          </div>

          {!documentHasContent && (
            <p className="flex items-start gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              本文が空です。編集してからAIを実行できます。
            </p>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground">自由指示</Label>
            <Textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setStatusMessage(null);
              }}
              placeholder="例: 見出しを整理して読みやすくして"
              rows={3}
              className="text-xs"
              disabled={loading}
            />
            <Button
              size="sm"
              disabled={!canRunCustom}
              onClick={() => runAi("custom", customPrompt)}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              自由指示で実行
            </Button>
          </div>

          {loading && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {selectedProvider.label}で処理中...
            </p>
          )}

          {localError && (
            <p
              role="alert"
              className="flex items-start gap-1.5 rounded-md border border-destructive/20 bg-card px-2.5 py-2 text-xs leading-relaxed text-destructive shadow-2xs"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>{localError}</span>
            </p>
          )}

          {statusMessage && !localError && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5 text-primary" />
              {statusMessage}
            </p>
          )}

          {result && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/70 p-3 shadow-xs">
              <span className="text-xs font-medium text-muted-foreground">
                提案（適用するまで原文は変わりません）
              </span>
              <div className="max-h-64 overflow-y-auto rounded-md border border-border bg-card p-2 text-sm">
                <MarkdownView content={result} />
              </div>
              <div className="grid gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => setReplaceConfirmOpen(true)}
                >
                  <Replace />
                  本文を置き換え
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={loading}
                  onClick={applyAppend}
                >
                  <Plus />
                  末尾に追記
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={copyResult}
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? "コピーしました" : "コピー"}
                </Button>
              </div>
            </div>
          )}

          {historyItems.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <History className="size-3.5 shrink-0" />
                  <span className="truncate">一時履歴</span>
                  <Badge variant="ghost">{historyItems.length}</Badge>
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="一時履歴をクリア"
                  disabled={loading}
                  onClick={clearHistory}
                >
                  <Trash2 />
                  クリア
                </Button>
              </div>
              <div className="grid gap-1.5">
                {historyItems.map((item, index) => (
                  <Button
                    key={item.id}
                    variant={
                      item.id === activeHistoryId ? "secondary" : "outline"
                    }
                    size="sm"
                    className="h-auto min-h-12 w-full flex-col items-start justify-start gap-1 px-2.5 py-2 text-left whitespace-normal"
                    disabled={loading}
                    onClick={() => restoreHistoryItem(item)}
                  >
                    <span className="flex w-full min-w-0 items-center gap-1.5">
                      <RotateCcw className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">
                        {item.taskLabel}
                      </span>
                      <Badge variant={index === 0 ? "secondary" : "ghost"}>
                        {index === 0 ? "最新" : `${index + 1}件目`}
                      </Badge>
                      <Badge variant="ghost">{item.providerLabel}</Badge>
                    </span>
                    <span className="w-full truncate text-xs leading-snug font-normal text-muted-foreground">
                      {getHistoryPreview(item.content)}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <AlertDialog
            open={replaceConfirmOpen}
            onOpenChange={setReplaceConfirmOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本文を置き換えますか</AlertDialogTitle>
                <AlertDialogDescription>
                  現在の本文をAIの提案で置き換えます。元の本文は上書きされます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={loading}
                  onClick={applyReplace}
                >
                  置き換える
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
