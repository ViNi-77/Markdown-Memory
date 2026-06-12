"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { format } from "date-fns";
import {
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  Upload,
  Plus,
  Trash2,
  Pencil,
  Download,
  Eye,
  PencilLine,
  Search,
  Check,
  Loader2,
  Inbox,
  Share2,
  Copy,
  Globe,
  X,
  Sparkles,
  ExternalLink,
  GripVertical,
  Maximize2,
} from "lucide-react";
import { AI_HANDOFF_SERVICES } from "@/lib/ai-handoff";
import type { Folder, Document } from "@/lib/db/schema";
import * as actions from "@/lib/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { AiAssistPanel } from "@/components/markdown/AiAssistPanel";

type Props = {
  initialFolders: Folder[];
  initialDocuments: Document[];
  userSlot: React.ReactNode;
  demoMode?: boolean;
};

type SaveState = "idle" | "saving" | "saved";
type PaneKey = "folders" | "files" | "details";

const DEFAULT_PANE_WIDTHS: Record<PaneKey, number> = {
  folders: 224,
  files: 288,
  details: 288,
};

const PANE_LIMITS: Record<PaneKey, { min: number; max: number }> = {
  folders: { min: 180, max: 360 },
  files: { min: 220, max: 560 },
  details: { min: 240, max: 440 },
};

const DEMO_USER_ID = "demo-user";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createLocalId(prefix: string): string {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
}

function createLocalFolder(name: string): Folder {
  return {
    id: createLocalId("folder"),
    userId: DEMO_USER_ID,
    name,
    createdAt: new Date(),
  };
}

function createLocalDocument(input: {
  name: string;
  content?: string;
  folderId?: string | null;
}): Document {
  const now = new Date();
  return {
    id: createLocalId("doc"),
    userId: DEMO_USER_ID,
    folderId: input.folderId ?? null,
    name: input.name,
    content: input.content ?? "",
    isPublic: false,
    shareToken: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function MarkdownWorkspace({
  initialFolders,
  initialDocuments,
  userSlot,
  demoMode = false,
}: Props) {
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all">(
    "all",
  );
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [editContent, setEditContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paneWidths, setPaneWidths] = useState(DEFAULT_PANE_WIDTHS);
  const [, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保存待ちの編集内容（id と本文）。デバウンス保存・フラッシュの単一の真実。
  const pendingSave = useRef<{ id: string; content: string } | null>(null);

  // Server Action を実行し、失敗時はエラーを表面化する共通ラッパー。
  const run = useCallback((fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        setError(null);
        await fn();
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "操作に失敗しました。時間をおいて再試行してください。",
        );
      }
    });
  }, []);

  // 保留中の編集を即座に保存する（デバウンス待ちを飛ばす）。
  // ファイル切替・プレビュー切替・離脱時に呼び、編集の取りこぼしを防ぐ。
  const flushSave = useCallback(() => {
    const pending = pendingSave.current;
    if (!pending) return;
    pendingSave.current = null;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const { id, content } = pending;
    if (demoMode) {
      const now = new Date();
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, content, updatedAt: now } : d)),
      );
      setSaveState("saved");
      return;
    }

    startTransition(async () => {
      try {
        await actions.updateDocumentContent(id, content);
        const now = new Date();
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === id ? { ...d, content, updatedAt: now } : d,
          ),
        );
        setSaveState("saved");
      } catch {
        // 失敗しても editContent には内容が残るので、ユーザーは再保存できる。
        pendingSave.current = { id, content };
        setSaveState("idle");
        setError(
          "保存に失敗しました。通信状況を確認してください（内容は保持されています）。",
        );
      }
    });
  }, [demoMode]);

  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedDocId) ?? null,
    [documents, selectedDocId],
  );

  const visibleDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents
      .filter((d) => {
        const inFolder =
          selectedFolderId === "all" ? true : d.folderId === selectedFolderId;
        if (!inFolder) return false;
        if (!q) return true;
        return (
          d.name.toLowerCase().includes(q) ||
          d.content.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [documents, selectedFolderId, search]);

  // 編集中に保留保存があるままタブを閉じようとしたら警告する（取りこぼし防止）。
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (pendingSave.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // テキストエリアの変更：保留保存に積み、デバウンスして自動保存する。
  function handleEditChange(value: string) {
    setEditContent(value);
    if (!selectedDoc) return;
    if (value === selectedDoc.content) return;
    pendingSave.current = { id: selectedDoc.id, content: value };
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 800);
  }

  function resizePane(key: PaneKey, delta: number) {
    setPaneWidths((prev) => {
      const limits = PANE_LIMITS[key];
      return {
        ...prev,
        [key]: clamp(prev[key] + delta, limits.min, limits.max),
      };
    });
  }

  function resetPane(key: PaneKey) {
    setPaneWidths((prev) => ({
      ...prev,
      [key]: DEFAULT_PANE_WIDTHS[key],
    }));
  }

  // ===== フォルダ操作 =====

  function handleCreateFolder() {
    const name = window.prompt("フォルダ名を入力してください");
    const trimmed = name?.trim();
    if (!trimmed) return;
    if (demoMode) {
      setFolders((prev) => [...prev, createLocalFolder(trimmed)]);
      return;
    }
    run(async () => {
      const folder = await actions.createFolder(trimmed);
      setFolders((prev) => [...prev, folder]);
    });
  }

  function handleRenameFolder(folder: Folder) {
    const name = window.prompt("新しいフォルダ名", folder.name);
    const trimmed = name?.trim();
    if (!trimmed || trimmed === folder.name) return;
    if (demoMode) {
      setFolders((prev) =>
        prev.map((f) => (f.id === folder.id ? { ...f, name: trimmed } : f)),
      );
      return;
    }
    run(async () => {
      await actions.renameFolder(folder.id, trimmed);
      setFolders((prev) =>
        prev.map((f) => (f.id === folder.id ? { ...f, name: trimmed } : f)),
      );
    });
  }

  function handleDeleteFolder(folder: Folder) {
    if (
      !window.confirm(
        `フォルダ「${folder.name}」を削除します。中のファイルはルートに戻ります。よろしいですか？`,
      )
    )
      return;
    if (demoMode) {
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setDocuments((prev) =>
        prev.map((d) =>
          d.folderId === folder.id ? { ...d, folderId: null } : d,
        ),
      );
      if (selectedFolderId === folder.id) setSelectedFolderId("all");
      return;
    }
    run(async () => {
      await actions.deleteFolder(folder.id);
      setFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setDocuments((prev) =>
        prev.map((d) =>
          d.folderId === folder.id ? { ...d, folderId: null } : d,
        ),
      );
      if (selectedFolderId === folder.id) setSelectedFolderId("all");
    });
  }

  function selectDocument(
    doc: Document,
    nextMode: "preview" | "edit" = "preview",
  ) {
    flushSave();
    setSelectedDocId(doc.id);
    setEditContent(doc.content);
    setSaveState("idle");
    setMode(nextMode);
    setCopied(false);
    setContentCopied(false);
  }

  function clearSelectedDocument() {
    flushSave();
    setSelectedDocId(null);
    setEditContent("");
    setSaveState("idle");
    setMode("preview");
    setCopied(false);
    setContentCopied(false);
  }

  // ===== ドキュメント操作 =====

  function handleNewDocument() {
    const folderId = selectedFolderId === "all" ? null : selectedFolderId;
    if (demoMode) {
      const doc = createLocalDocument({ name: "無題.md", folderId });
      setDocuments((prev) => [doc, ...prev]);
      selectDocument(doc, "edit");
      return;
    }
    run(async () => {
      const doc = await actions.createDocument({ name: "無題.md", folderId });
      setDocuments((prev) => [doc, ...prev]);
      selectDocument(doc, "edit");
    });
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const folderId = selectedFolderId === "all" ? null : selectedFolderId;
    if (demoMode) {
      startTransition(async () => {
        let lastDoc: Document | null = null;
        for (const file of Array.from(fileList)) {
          const lower = file.name.toLowerCase();
          if (!lower.endsWith(".md") && !lower.endsWith(".markdown")) {
            window.alert(`${file.name} は Markdown ファイルではありません。`);
            continue;
          }
          const doc = createLocalDocument({
            name: file.name,
            content: await file.text(),
            folderId,
          });
          setDocuments((prev) => [doc, ...prev]);
          lastDoc = doc;
        }
        if (lastDoc) selectDocument(lastDoc);
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    run(async () => {
      let lastDoc: Document | null = null;
      for (const file of Array.from(fileList)) {
        const lower = file.name.toLowerCase();
        if (!lower.endsWith(".md") && !lower.endsWith(".markdown")) {
          window.alert(`${file.name} は Markdown ファイルではありません。`);
          continue;
        }
        const content = await file.text();
        const doc = await actions.createDocument({
          name: file.name,
          content,
          folderId,
        });
        setDocuments((prev) => [doc, ...prev]);
        lastDoc = doc;
      }
      if (lastDoc) selectDocument(lastDoc);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRenameDoc(doc: Document) {
    const name = window.prompt("新しいファイル名", doc.name);
    const trimmed = name?.trim();
    if (!trimmed || trimmed === doc.name) return;
    if (demoMode) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, name: trimmed } : d)),
      );
      return;
    }
    run(async () => {
      await actions.renameDocument(doc.id, trimmed);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, name: trimmed } : d)),
      );
    });
  }

  function handleMoveDoc(doc: Document, value: string) {
    const folderId = value === "root" ? null : value;
    if (demoMode) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, folderId } : d)),
      );
      return;
    }
    run(async () => {
      await actions.moveDocument(doc.id, folderId);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, folderId } : d)),
      );
    });
  }

  function handleDeleteDoc(doc: Document) {
    if (!window.confirm(`「${doc.name}」を削除します。よろしいですか？`))
      return;
    if (demoMode) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDocId === doc.id) clearSelectedDocument();
      return;
    }
    run(async () => {
      await actions.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (selectedDocId === doc.id) clearSelectedDocument();
    });
  }

  function handleDownload(doc: Document) {
    const blob = new Blob([doc.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name.endsWith(".md") ? doc.name : `${doc.name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ===== 共有 =====

  function shareUrl(token: string) {
    return `${window.location.origin}/share/${token}`;
  }

  function handleEnableShare(doc: Document) {
    if (demoMode) {
      setError(
        "デモでは公開リンクを作成できません。保存と共有はサインイン後に利用できます。",
      );
      return;
    }
    run(async () => {
      const token = await actions.enableShare(doc.id);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, isPublic: true, shareToken: token } : d,
        ),
      );
    });
  }

  function handleDisableShare(doc: Document) {
    if (
      !window.confirm(
        "公開を停止します。共有URLは無効になります。よろしいですか？",
      )
    )
      return;
    if (demoMode) {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, isPublic: false, shareToken: null } : d,
        ),
      );
      return;
    }
    run(async () => {
      await actions.disableShare(doc.id);
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, isPublic: false, shareToken: null } : d,
        ),
      );
    });
  }

  async function handleCopyShareUrl(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("以下のURLをコピーしてください", shareUrl(token));
    }
  }

  // ===== AI再投入（本文コピー + サービスを新規タブで開く） =====

  function handleAiContentChange(content: string) {
    if (!selectedDoc) return;
    pendingSave.current = null;
    const now = new Date();
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === selectedDoc.id ? { ...d, content, updatedAt: now } : d,
      ),
    );
    setEditContent(content);
    setSaveState("saved");
  }

  async function handleAiHandoff(doc: Document, serviceUrl: string) {
    if (!doc.content.trim()) {
      setError("本文が空です。AIに渡す内容がありません。");
      return;
    }
    try {
      await navigator.clipboard.writeText(doc.content);
      setContentCopied(true);
      setTimeout(() => setContentCopied(false), 2000);
      window.open(serviceUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError(
        "クリップボードへのコピーに失敗しました。ブラウザの権限を確認してください。",
      );
    }
  }

  function handleOpenFullView(doc: Document) {
    if (demoMode) {
      setError("デモでは全画面表示を開けません。ログイン後に利用できます。");
      return;
    }
    flushSave();
    window.open(`/view/${doc.id}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex h-dvh w-full overflow-x-auto overflow-y-hidden bg-background">
      {/* ===== ペイン1: フォルダ（スマホでは非表示・横スクロールで他ペイン優先） ===== */}
      <aside
        className="hidden shrink-0 flex-col gap-3 border-r border-border bg-sidebar p-3 sm:flex"
        style={{ width: paneWidths.folders }}
      >
        <div className="flex items-center gap-2 px-1">
          <FileText className="size-5 text-primary" />
          <span className="font-heading text-sm font-semibold">
            Markdown Memory
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="justify-start"
          onClick={handleCreateFolder}
        >
          <FolderPlus />
          フォルダを追加
        </Button>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          <FolderRow
            active={selectedFolderId === "all"}
            icon={<Inbox className="size-4" />}
            label="すべてのファイル"
            count={documents.length}
            onClick={() => setSelectedFolderId("all")}
          />
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              active={selectedFolderId === folder.id}
              icon={<FolderIcon className="size-4" />}
              label={folder.name}
              count={documents.filter((d) => d.folderId === folder.id).length}
              onClick={() => setSelectedFolderId(folder.id)}
              onRename={() => handleRenameFolder(folder)}
              onDelete={() => handleDeleteFolder(folder)}
            />
          ))}
        </nav>

        <div className="border-t border-border pt-3">{userSlot}</div>
      </aside>

      <PaneResizeHandle
        label="フォルダペインの幅を調整"
        onResize={(delta) => resizePane("folders", delta)}
        onReset={() => resetPane("folders")}
      />

      {/* ===== ペイン2: ファイル一覧 ===== */}
      <section
        className={cn(
          "flex shrink-0 flex-col border-r border-border",
          isDragging && "bg-primary/5 ring-2 ring-primary/40 ring-inset",
        )}
        style={{ width: paneWidths.files }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload />
              アップロード
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleNewDocument}
            >
              <Plus />
              新規作成
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,text/markdown"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ファイル名・内容で検索"
              className="pl-8"
            />
          </div>
        </div>

        <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {visibleDocs.length === 0 ? (
            <li className="px-2 py-8 text-center text-sm text-muted-foreground">
              ファイルがありません。
              <br />
              アップロードまたは新規作成してください。
            </li>
          ) : (
            visibleDocs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => selectDocument(doc)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    selectedDocId === doc.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-2 truncate text-sm font-medium">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.name}</span>
                  </span>
                  <span className="truncate pl-6 text-xs text-muted-foreground">
                    {format(new Date(doc.updatedAt), "yyyy/MM/dd HH:mm")}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <PaneResizeHandle
        label="ファイル一覧ペインの幅を調整"
        onResize={(delta) => resizePane("files", delta)}
        onReset={() => resetPane("files")}
      />

      {/* ===== ペイン3: 本文（プレビュー / 編集） ===== */}
      <section className="flex min-w-[min(100%,320px)] flex-1 flex-col sm:min-w-[280px]">
        {selectedDoc ? (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate font-heading text-base font-semibold">
                  {selectedDoc.name}
                </h1>
                {saveState === "saving" && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    保存中
                  </span>
                )}
                {saveState === "saved" && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Check className="size-3" />
                    保存済み
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenFullView(selectedDoc)}
                >
                  <Maximize2 />
                  全画面
                </Button>
                <Button
                  variant={mode === "preview" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    flushSave();
                    setMode("preview");
                  }}
                >
                  <Eye />
                  プレビュー
                </Button>
                <Button
                  variant={mode === "edit" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setMode("edit")}
                >
                  <PencilLine />
                  編集
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="削除"
                  className="text-destructive hover:text-destructive focus-visible:text-destructive"
                  onClick={() => handleDeleteDoc(selectedDoc)}
                >
                  <Trash2 />
                </Button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {mode === "edit" ? (
                <Textarea
                  value={editContent}
                  onChange={(e) => handleEditChange(e.target.value)}
                  placeholder="# Markdown を入力..."
                  className="h-full min-h-full resize-none rounded-none border-0 bg-background px-5 py-4 font-mono text-sm leading-relaxed focus-visible:ring-0"
                />
              ) : (
                <div className="mx-auto max-w-3xl px-6 py-6">
                  {selectedDoc.content.trim() ? (
                    <MarkdownView content={selectedDoc.content} />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      本文が空です。「編集」から入力してください。
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <FileText className="size-7" />
            </div>
            <p className="text-sm">
              左の一覧からファイルを選ぶか、
              <br />
              アップロード・新規作成してください。
            </p>
          </div>
        )}
      </section>

      {/* ===== ペイン4: 詳細・アクション ===== */}
      {selectedDoc && (
        <>
          <PaneResizeHandle
            label="詳細ペインの幅を調整"
            onResize={(delta) => resizePane("details", -delta)}
            onReset={() => resetPane("details")}
          />
          <aside
            className="flex shrink-0 flex-col gap-5 border-l border-border bg-card p-4"
            style={{ width: paneWidths.details }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                ファイル名
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {selectedDoc.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="名前を変更"
                  onClick={() => handleRenameDoc(selectedDoc)}
                >
                  <Pencil />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                フォルダ
              </span>
              <select
                value={selectedDoc.folderId ?? "root"}
                onChange={(e) => handleMoveDoc(selectedDoc, e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="root">ルート（フォルダなし）</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <dl className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">作成</dt>
                <dd>
                  {format(new Date(selectedDoc.createdAt), "yyyy/MM/dd HH:mm")}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">更新</dt>
                <dd>
                  {format(new Date(selectedDoc.updatedAt), "yyyy/MM/dd HH:mm")}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="size-3.5" />
                ファイル操作
              </span>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => handleOpenFullView(selectedDoc)}
              >
                <Maximize2 />
                全画面
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => handleDownload(selectedDoc)}
              >
                <Download />
                ダウンロード
              </Button>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Share2 className="size-3.5" />
                共有
              </span>
              {selectedDoc.isPublic && selectedDoc.shareToken ? (
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 text-xs text-primary">
                    <Globe className="size-3.5" />
                    公開中（リンクを知る全員が閲覧可）
                  </span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 justify-start"
                      onClick={() =>
                        handleCopyShareUrl(selectedDoc.shareToken!)
                      }
                    >
                      {copied ? <Check /> : <Copy />}
                      {copied ? "コピーしました" : "URLをコピー"}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="justify-start text-destructive"
                    onClick={() => handleDisableShare(selectedDoc)}
                  >
                    公開を停止
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => handleEnableShare(selectedDoc)}
                >
                  <Globe />
                  公開リンクを作成
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" />
                AIへ渡す
              </span>
              {contentCopied && (
                <span className="flex items-center gap-1.5 text-xs text-primary">
                  <Check className="size-3.5" />
                  本文をコピーしました。開いたタブに貼り付けてください。
                </span>
              )}
              <div className="flex flex-col gap-1.5">
                {AI_HANDOFF_SERVICES.map((service) => (
                  <Button
                    key={service.id}
                    variant="outline"
                    size="sm"
                    className="justify-between"
                    onClick={() => handleAiHandoff(selectedDoc, service.url)}
                  >
                    <span>{service.label} を開く</span>
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </Button>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                本文をコピーしてから各AIを開きます。貼り付け（Ctrl+V /
                ⌘V）で渡せます。
              </p>
            </div>

            <AiAssistPanel
              key={selectedDoc.id}
              document={selectedDoc}
              demoMode={demoMode}
              onContentChange={handleAiContentChange}
              onError={setError}
            />
          </aside>
        </>
      )}

      {error && (
        <div className="fixed bottom-4 left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive shadow-lg ring-1 ring-destructive/20">
          <span className="flex-1">{error}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-destructive"
            title="閉じる"
            onClick={() => setError(null)}
          >
            <X />
          </Button>
        </div>
      )}
    </div>
  );
}

function PaneResizeHandle({
  label,
  onResize,
  onReset,
}: {
  label: string;
  onResize: (delta: number) => void;
  onReset: () => void;
}) {
  const lastX = useRef<number | null>(null);

  function endDrag() {
    lastX.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  return (
    <div
      aria-label={label}
      aria-orientation="vertical"
      role="separator"
      tabIndex={0}
      title={`${label}（ダブルクリックでリセット）`}
      className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors outline-none hover:bg-primary/10 focus-visible:bg-primary/10 sm:flex"
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onResize(-16);
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          onResize(16);
        }
        if (e.key === "Home") {
          e.preventDefault();
          onReset();
        }
      }}
      onPointerDown={(e) => {
        lastX.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
      }}
      onPointerMove={(e) => {
        if (lastX.current === null) return;
        const delta = e.clientX - lastX.current;
        lastX.current = e.clientX;
        onResize(delta);
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <GripVertical className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </div>
  );
}

function FolderRow({
  active,
  icon,
  label,
  count,
  onClick,
  onRename,
  onDelete,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group/folder flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "hover:bg-sidebar-accent/50",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="truncate">{label}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {count}
        </span>
      </button>
      {(onRename || onDelete) && (
        <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/folder:opacity-100">
          {onRename && (
            <Button
              variant="ghost"
              size="icon-xs"
              title="名前を変更"
              onClick={onRename}
            >
              <Pencil />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon-xs"
              title="削除"
              onClick={onDelete}
            >
              <Trash2 />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
