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
};

type SaveState = "idle" | "saving" | "saved";

export function MarkdownWorkspace({
  initialFolders,
  initialDocuments,
  userSlot,
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
  }, []);

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

  // ===== フォルダ操作 =====

  function handleCreateFolder() {
    const name = window.prompt("フォルダ名を入力してください");
    if (!name?.trim()) return;
    run(async () => {
      const folder = await actions.createFolder(name);
      setFolders((prev) => [...prev, folder]);
    });
  }

  function handleRenameFolder(folder: Folder) {
    const name = window.prompt("新しいフォルダ名", folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;
    run(async () => {
      await actions.renameFolder(folder.id, name);
      setFolders((prev) =>
        prev.map((f) => (f.id === folder.id ? { ...f, name: name.trim() } : f)),
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
    run(async () => {
      const doc = await actions.createDocument({ name: "無題.md", folderId });
      setDocuments((prev) => [doc, ...prev]);
      selectDocument(doc, "edit");
    });
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const folderId = selectedFolderId === "all" ? null : selectedFolderId;
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
    if (!name?.trim() || name.trim() === doc.name) return;
    run(async () => {
      await actions.renameDocument(doc.id, name);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, name: name.trim() } : d)),
      );
    });
  }

  function handleMoveDoc(doc: Document, value: string) {
    const folderId = value === "root" ? null : value;
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

  return (
    <div className="flex h-dvh w-full overflow-x-auto overflow-y-hidden bg-background">
      {/* ===== ペイン1: フォルダ（スマホでは非表示・横スクロールで他ペイン優先） ===== */}
      <aside className="hidden w-48 shrink-0 flex-col gap-3 border-r border-border bg-sidebar p-3 sm:flex md:w-56">
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

      {/* ===== ペイン2: ファイル一覧 ===== */}
      <section
        className={cn(
          "flex w-56 shrink-0 flex-col border-r border-border md:w-72",
          isDragging && "bg-primary/5 ring-2 ring-primary/40 ring-inset",
        )}
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
        <aside className="flex w-64 shrink-0 flex-col gap-5 border-l border-border bg-card p-4 md:w-72">
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
                    onClick={() => handleCopyShareUrl(selectedDoc.shareToken!)}
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
            onContentChange={handleAiContentChange}
            onError={setError}
          />

          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => handleDownload(selectedDoc)}
            >
              <Download />
              ダウンロード
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="justify-start"
              onClick={() => handleDeleteDoc(selectedDoc)}
            >
              <Trash2 />
              削除
            </Button>
          </div>
        </aside>
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
