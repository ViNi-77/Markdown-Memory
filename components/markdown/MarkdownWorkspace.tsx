"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
  MessageSquare,
  ChevronDown,
  UserCircle,
  ArrowLeft,
} from "lucide-react";
import { AI_HANDOFF_SERVICES } from "@/lib/ai-handoff";
import { formatWorkspaceDateTime } from "@/lib/workspace-date";
import type { Folder, Document } from "@/lib/db/schema";
import * as actions from "@/lib/actions";
import { cn } from "@/lib/utils";
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
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { AiAssistPanel } from "@/components/markdown/AiAssistPanel";

type Props = {
  initialFolders: Folder[];
  initialDocuments: WorkspaceDocument[];
  userSlot: React.ReactNode;
  demoMode?: boolean;
};

type WorkspaceDocument = Omit<Document, "content"> & {
  content?: string;
};

type SaveState = "idle" | "saving" | "saved";
type PaneKey = "folders" | "files" | "details";
type MobilePanel = "folders" | "account" | null;
type MobileView = "files" | "document" | "details";
type TextActionDialog =
  | { type: "create-folder" }
  | { type: "rename-folder"; folder: Folder }
  | { type: "rename-document"; doc: WorkspaceDocument };
type ConfirmActionDialog =
  | { type: "delete-folder"; folder: Folder }
  | { type: "delete-document"; doc: WorkspaceDocument }
  | { type: "disable-share"; doc: WorkspaceDocument };

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
const FEEDBACK_URL =
  "https://github.com/ViNi-77/Markdown-Memory/issues/new/choose";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function shouldUseMobilePaneNavigation(): boolean {
  return window.matchMedia("(max-width: 639px)").matches;
}

function hasLoadedContent(doc: WorkspaceDocument | null): doc is Document {
  return typeof doc?.content === "string";
}

function mergeDocumentMetadata(
  current: WorkspaceDocument[],
  incoming: WorkspaceDocument[],
): WorkspaceDocument[] {
  if (incoming.length === 0) return current;

  const incomingById = new Map(incoming.map((doc) => [doc.id, doc]));
  const seen = new Set<string>();
  const merged = current.map((doc) => {
    const metadata = incomingById.get(doc.id);
    if (!metadata) return doc;
    seen.add(doc.id);
    return hasLoadedContent(doc)
      ? { ...metadata, content: doc.content }
      : metadata;
  });
  const missing = incoming.filter((doc) => !seen.has(doc.id));
  return [...merged, ...missing];
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
  const [documents, setDocuments] =
    useState<WorkspaceDocument[]>(initialDocuments);
  const [selectedFolderId, setSelectedFolderId] = useState<string | "all">(
    "all",
  );
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [editContent, setEditContent] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<
    WorkspaceDocument[] | null
  >(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paneWidths, setPaneWidths] = useState(DEFAULT_PANE_WIDTHS);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [mobileView, setMobileView] = useState<MobileView>("files");
  const [isPending, startTransition] = useTransition();
  const [textActionDialog, setTextActionDialog] =
    useState<TextActionDialog | null>(null);
  const [textActionValue, setTextActionValue] = useState("");
  const [confirmActionDialog, setConfirmActionDialog] =
    useState<ConfirmActionDialog | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const fileListPaneRef = useRef<HTMLElement>(null);
  const documentPaneRef = useRef<HTMLElement>(null);
  const detailsPaneRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 保存待ちの編集内容（id と本文）。デバウンス保存・フラッシュの単一の真実。
  const pendingSave = useRef<{ id: string; content: string } | null>(null);
  const selectedDocIdRef = useRef<string | null>(null);
  const searchRequestIdRef = useRef(0);

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

  useEffect(() => {
    selectedDocIdRef.current = selectedDocId;
  }, [selectedDocId]);

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
  const loadedSelectedDoc = hasLoadedContent(selectedDoc) ? selectedDoc : null;
  const selectedDocLoading =
    Boolean(selectedDoc) &&
    loadingDocId === selectedDoc?.id &&
    !loadedSelectedDoc;

  function handleSearchChange(value: string) {
    setSearch(value);
    searchRequestIdRef.current += 1;
    if (demoMode || !value.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
  }

  useEffect(() => {
    const query = search.trim();
    if (demoMode || !query) return;

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    const timer = window.setTimeout(() => {
      actions
        .searchDocuments({ query, folderId: selectedFolderId })
        .then((results) => {
          if (searchRequestIdRef.current !== requestId) return;
          setSearchResults(results);
          setDocuments((prev) => mergeDocumentMetadata(prev, results));
        })
        .catch((e) => {
          if (searchRequestIdRef.current !== requestId) return;
          setSearchResults([]);
          setError(
            e instanceof Error
              ? e.message
              : "検索に失敗しました。時間をおいて再試行してください。",
          );
        })
        .finally(() => {
          if (searchRequestIdRef.current === requestId) {
            setSearchLoading(false);
          }
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [demoMode, search, selectedFolderId]);

  const localVisibleDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents
      .filter((d) => {
        const inFolder =
          selectedFolderId === "all" ? true : d.folderId === selectedFolderId;
        if (!inFolder) return false;
        if (!q) return true;
        return (
          d.name.toLowerCase().includes(q) ||
          (typeof d.content === "string" && d.content.toLowerCase().includes(q))
        );
      })
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }, [documents, selectedFolderId, search]);
  const serverSearchActive = !demoMode && search.trim().length > 0;
  const visibleDocs = serverSearchActive
    ? (searchResults ?? [])
    : localVisibleDocs;

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
    if (!loadedSelectedDoc) return;
    if (value === loadedSelectedDoc.content) return;
    pendingSave.current = { id: loadedSelectedDoc.id, content: value };
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

  function scrollToMobilePane(
    ref: RefObject<HTMLElement | null>,
    nextView?: MobileView,
  ) {
    const workspace = workspaceRef.current;
    const pane = ref.current;
    if (!workspace || !pane) return;
    if (nextView) setMobileView(nextView);
    workspace.scrollTo({
      left: pane.offsetLeft,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const workspaceElement = workspace;

    let frame = 0;
    function updateMobileView() {
      frame = 0;
      if (!shouldUseMobilePaneNavigation()) return;
      const candidates: Array<{
        view: MobileView;
        left: number;
        available: boolean;
      }> = [
        {
          view: "files",
          left: fileListPaneRef.current?.offsetLeft ?? 0,
          available: true,
        },
        {
          view: "document",
          left: documentPaneRef.current?.offsetLeft ?? 0,
          available: Boolean(selectedDocId),
        },
        {
          view: "details",
          left: detailsPaneRef.current?.offsetLeft ?? 0,
          available: Boolean(selectedDocId && detailsPaneRef.current),
        },
      ];
      const closest = candidates
        .filter((candidate) => candidate.available)
        .reduce((best, candidate) =>
          Math.abs(workspaceElement.scrollLeft - candidate.left) <
          Math.abs(workspaceElement.scrollLeft - best.left)
            ? candidate
            : best,
        );
      setMobileView((current) =>
        current === closest.view ? current : closest.view,
      );
    }

    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(updateMobileView);
    }

    updateMobileView();
    workspaceElement.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      workspaceElement.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [selectedDocId]);

  // ===== フォルダ操作 =====

  function handleCreateFolder() {
    setMobilePanel(null);
    setTextActionDialog({ type: "create-folder" });
    setTextActionValue("");
  }

  function createFolderFromDialog(name: string) {
    const trimmed = name.trim();
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
    setMobilePanel(null);
    setTextActionDialog({ type: "rename-folder", folder });
    setTextActionValue(folder.name);
  }

  function renameFolderFromDialog(folder: Folder, name: string) {
    const trimmed = name.trim();
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
    setMobilePanel(null);
    setConfirmActionDialog({ type: "delete-folder", folder });
  }

  function deleteFolderFromDialog(folder: Folder) {
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
    doc: WorkspaceDocument,
    nextMode: "preview" | "edit" = "preview",
  ) {
    flushSave();
    selectedDocIdRef.current = doc.id;
    setSelectedDocId(doc.id);
    setEditContent(doc.content ?? "");
    setSaveState("idle");
    setMode(nextMode);
    setCopied(false);
    setContentCopied(false);
    setError(null);
    if (shouldUseMobilePaneNavigation()) {
      setMobileView("document");
      requestAnimationFrame(() => scrollToMobilePane(documentPaneRef));
    }
    if (hasLoadedContent(doc) || demoMode) {
      setLoadingDocId((current) => (current === doc.id ? null : current));
      return;
    }

    setLoadingDocId(doc.id);
    startTransition(async () => {
      try {
        const loadedDoc = await actions.getDocument(doc.id);
        setDocuments((prev) =>
          prev.map((d) => (d.id === loadedDoc.id ? loadedDoc : d)),
        );
        if (selectedDocIdRef.current === loadedDoc.id) {
          setEditContent(loadedDoc.content);
        }
      } catch (e) {
        if (selectedDocIdRef.current === doc.id) {
          setError(
            e instanceof Error
              ? e.message
              : "本文の読み込みに失敗しました。時間をおいて再試行してください。",
          );
        }
      } finally {
        setLoadingDocId((current) => (current === doc.id ? null : current));
      }
    });
  }

  function clearSelectedDocument() {
    flushSave();
    selectedDocIdRef.current = null;
    setSelectedDocId(null);
    setLoadingDocId(null);
    setEditContent("");
    setSaveState("idle");
    setMode("preview");
    setCopied(false);
    setContentCopied(false);
    if (shouldUseMobilePaneNavigation()) {
      setMobileView("files");
      requestAnimationFrame(() => scrollToMobilePane(fileListPaneRef));
    }
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
            setError(`${file.name} は Markdown ファイルではありません。`);
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
          setError(`${file.name} は Markdown ファイルではありません。`);
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

  function handleRenameDoc(doc: WorkspaceDocument) {
    setTextActionDialog({ type: "rename-document", doc });
    setTextActionValue(doc.name);
  }

  function renameDocFromDialog(doc: WorkspaceDocument, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === doc.name) return;
    if (demoMode) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, name: trimmed } : d)),
      );
      setSearchResults(
        (prev) =>
          prev?.map((d) => (d.id === doc.id ? { ...d, name: trimmed } : d)) ??
          null,
      );
      return;
    }
    run(async () => {
      await actions.renameDocument(doc.id, trimmed);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, name: trimmed } : d)),
      );
      setSearchResults(
        (prev) =>
          prev?.map((d) => (d.id === doc.id ? { ...d, name: trimmed } : d)) ??
          null,
      );
    });
  }

  function handleMoveDoc(doc: WorkspaceDocument, value: string) {
    const folderId = value === "root" ? null : value;
    if (demoMode) {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, folderId } : d)),
      );
      setSearchResults(
        (prev) =>
          prev?.map((d) => (d.id === doc.id ? { ...d, folderId } : d)) ?? null,
      );
      return;
    }
    run(async () => {
      await actions.moveDocument(doc.id, folderId);
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, folderId } : d)),
      );
      setSearchResults(
        (prev) =>
          prev?.map((d) => (d.id === doc.id ? { ...d, folderId } : d)) ?? null,
      );
    });
  }

  function handleDeleteDoc(doc: WorkspaceDocument) {
    setConfirmActionDialog({ type: "delete-document", doc });
  }

  function deleteDocFromDialog(doc: WorkspaceDocument) {
    if (demoMode) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setSearchResults((prev) => prev?.filter((d) => d.id !== doc.id) ?? null);
      if (selectedDocId === doc.id) clearSelectedDocument();
      return;
    }
    run(async () => {
      await actions.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      setSearchResults((prev) => prev?.filter((d) => d.id !== doc.id) ?? null);
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

  function handleEnableShare(doc: WorkspaceDocument) {
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

  function handleDisableShare(doc: WorkspaceDocument) {
    setConfirmActionDialog({ type: "disable-share", doc });
  }

  function disableShareFromDialog(doc: WorkspaceDocument) {
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
      setError(
        "共有URLのコピーに失敗しました。ブラウザのクリップボード権限を確認してください。",
      );
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

  function closeTextActionDialog(open: boolean) {
    if (open) return;
    setTextActionDialog(null);
    setTextActionValue("");
  }

  function submitTextActionDialog() {
    const dialog = textActionDialog;
    const value = textActionValue.trim();
    if (!dialog || !value) return;

    setTextActionDialog(null);
    setTextActionValue("");

    if (dialog.type === "create-folder") {
      createFolderFromDialog(value);
      return;
    }
    if (dialog.type === "rename-folder") {
      renameFolderFromDialog(dialog.folder, value);
      return;
    }
    renameDocFromDialog(dialog.doc, value);
  }

  function closeConfirmActionDialog(open: boolean) {
    if (open) return;
    setConfirmActionDialog(null);
  }

  function submitConfirmActionDialog() {
    const dialog = confirmActionDialog;
    if (!dialog) return;

    setConfirmActionDialog(null);

    if (dialog.type === "delete-folder") {
      deleteFolderFromDialog(dialog.folder);
      return;
    }
    if (dialog.type === "delete-document") {
      deleteDocFromDialog(dialog.doc);
      return;
    }
    disableShareFromDialog(dialog.doc);
  }

  function handleOpenFullView(doc: WorkspaceDocument) {
    if (demoMode) {
      setError("デモでは全画面表示を開けません。ログイン後に利用できます。");
      return;
    }
    flushSave();
    window.open(`/view/${doc.id}`, "_blank", "noopener,noreferrer");
  }

  function mobileNavClass(view: MobileView) {
    return cn(
      "h-11 px-2",
      mobileView === view &&
        "bg-secondary text-secondary-foreground shadow-sm ring-1 ring-border/70 hover:bg-secondary",
    );
  }

  const trimmedTextActionValue = textActionValue.trim();
  const textActionTitle =
    textActionDialog?.type === "create-folder"
      ? "フォルダを追加"
      : textActionDialog?.type === "rename-folder"
        ? "フォルダ名を変更"
        : "ファイル名を変更";
  const textActionDescription =
    textActionDialog?.type === "create-folder"
      ? "新しいフォルダ名を入力してください。"
      : textActionDialog?.type === "rename-folder"
        ? "フォルダ名を入力してください。中のファイルはそのまま残ります。"
        : "Markdownファイルの表示名を入力してください。";
  const textActionInputLabel =
    textActionDialog?.type === "rename-document" ? "ファイル名" : "フォルダ名";
  const textActionSubmitLabel =
    textActionDialog?.type === "create-folder" ? "追加" : "変更";
  const textActionDisabled =
    !trimmedTextActionValue ||
    (textActionDialog?.type === "rename-folder" &&
      trimmedTextActionValue === textActionDialog.folder.name) ||
    (textActionDialog?.type === "rename-document" &&
      trimmedTextActionValue === textActionDialog.doc.name) ||
    isPending;
  const confirmActionTitle =
    confirmActionDialog?.type === "delete-folder"
      ? "フォルダを削除"
      : confirmActionDialog?.type === "delete-document"
        ? "ファイルを削除"
        : "公開を停止";
  const confirmActionDescription =
    confirmActionDialog?.type === "delete-folder"
      ? `「${confirmActionDialog.folder.name}」を削除します。中のファイルはルートへ戻ります。`
      : confirmActionDialog?.type === "delete-document"
        ? `「${confirmActionDialog.doc.name}」を削除します。`
        : "共有URLは無効になり、リンクを知っている人も本文を読めなくなります。";
  const confirmActionLabel =
    confirmActionDialog?.type === "disable-share" ? "公開を停止" : "削除";

  return (
    <div
      ref={workspaceRef}
      data-testid="markdown-workspace"
      className="flex h-dvh w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth bg-canvas sm:snap-none"
    >
      {/* ===== ペイン1: フォルダ（スマホでは非表示・横スクロールで他ペイン優先） ===== */}
      <aside
        className="hidden shrink-0 flex-col gap-3 border-r border-sidebar-border bg-sidebar p-3 shadow-sm sm:flex"
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

        <div className="flex flex-col gap-2 border-t border-border pt-3">
          {userSlot}
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "justify-start",
            )}
          >
            <MessageSquare />
            フィードバック
          </a>
        </div>
      </aside>

      <PaneResizeHandle
        label="フォルダペインの幅を調整"
        onResize={(delta) => resizePane("folders", delta)}
        onReset={() => resetPane("folders")}
      />

      {/* ===== ペイン2: ファイル一覧 ===== */}
      <section
        ref={fileListPaneRef}
        data-testid="file-list-pane"
        className={cn(
          "flex min-w-[100dvw] shrink-0 snap-start flex-col border-r border-border bg-background/95 sm:min-w-0",
          isDragging && "bg-primary/5 ring-2 ring-primary/35 ring-inset",
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
        <div className="flex flex-col gap-2 border-b border-border bg-card/75 p-3 shadow-2xs">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-start sm:hidden"
              aria-label="フォルダ管理を開く"
              onClick={() => setMobilePanel("folders")}
            >
              <FolderIcon />
              フォルダ
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="justify-start sm:hidden"
              aria-label="アカウントメニューを開く"
              onClick={() => setMobilePanel("account")}
            >
              <UserCircle />
              アカウント
            </Button>
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
            {searchLoading && (
              <Loader2 className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="ファイル名・内容で検索"
              placeholder="ファイル名・内容で検索"
              className={cn("pl-8", searchLoading && "pr-8")}
            />
          </div>
          {selectedDoc && (
            <div
              data-testid="mobile-current-document"
              className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2 shadow-xs sm:hidden"
            >
              <FileText className="size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <span className="block text-[0.68rem] leading-none font-medium text-muted-foreground">
                  選択中
                </span>
                <span className="block truncate text-sm font-medium">
                  {selectedDoc.name}
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0"
                aria-label="選択中の本文を開く"
                onClick={() => scrollToMobilePane(documentPaneRef, "document")}
              >
                <Eye />
                読む
              </Button>
            </div>
          )}
        </div>

        <ul
          aria-live="polite"
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:pb-2"
        >
          {visibleDocs.length === 0 ? (
            <li className="px-2 py-8 text-center text-sm text-muted-foreground">
              {searchLoading ? (
                "検索しています。"
              ) : search.trim() ? (
                "一致するファイルがありません。"
              ) : (
                <>
                  ファイルがありません。
                  <br />
                  アップロードまたは新規作成してください。
                </>
              )}
            </li>
          ) : (
            visibleDocs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => selectDocument(doc)}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-all",
                    selectedDocId === doc.id
                      ? "bg-accent text-accent-foreground shadow-xs ring-1 ring-border/70"
                      : "hover:bg-muted/80 hover:shadow-2xs",
                  )}
                >
                  <span className="flex items-center gap-2 truncate text-sm font-medium">
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{doc.name}</span>
                  </span>
                  <span className="truncate pl-6 text-xs text-muted-foreground">
                    {formatWorkspaceDateTime(doc.updatedAt)}
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
      <section
        ref={documentPaneRef}
        data-testid="document-pane"
        className="flex min-w-[100dvw] flex-1 snap-start flex-col bg-background sm:min-w-[280px]"
      >
        {selectedDoc ? (
          <>
            <header
              data-testid="document-header"
              className="document-header-responsive flex min-w-0 flex-wrap items-center gap-2 border-b border-border bg-card/80 px-3 py-2 shadow-2xs sm:gap-3 sm:px-5 sm:py-3"
            >
              <div
                data-testid="document-title-row"
                className="flex min-w-0 flex-1 basis-52 items-center gap-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="-ml-1 sm:hidden"
                  aria-label="一覧に戻る"
                  onClick={() => scrollToMobilePane(fileListPaneRef, "files")}
                >
                  <ArrowLeft />
                </Button>
                <h1 className="min-w-0 flex-1 truncate font-heading text-sm font-semibold sm:text-base">
                  {selectedDoc.name}
                </h1>
                {selectedDocLoading && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    読み込み中
                  </span>
                )}
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
              <div
                data-testid="document-header-actions"
                className="ml-auto flex min-w-max shrink-0 items-center gap-0.5 sm:gap-1"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="max-sm:size-9 max-sm:px-0"
                  aria-label="全画面"
                  onClick={() => handleOpenFullView(selectedDoc)}
                >
                  <Maximize2 />
                  <span className="document-header-action-label hidden sm:inline">
                    全画面
                  </span>
                </Button>
                <Button
                  variant={mode === "preview" ? "secondary" : "ghost"}
                  size="sm"
                  className="max-sm:size-9 max-sm:px-0"
                  aria-label="プレビュー"
                  onClick={() => {
                    flushSave();
                    setMode("preview");
                  }}
                >
                  <Eye />
                  <span className="document-header-action-label hidden sm:inline">
                    プレビュー
                  </span>
                </Button>
                <Button
                  variant={mode === "edit" ? "secondary" : "ghost"}
                  size="sm"
                  className="max-sm:size-9 max-sm:px-0"
                  aria-label="編集"
                  disabled={!loadedSelectedDoc}
                  onClick={() => setMode("edit")}
                >
                  <PencilLine />
                  <span className="document-header-action-label hidden sm:inline">
                    編集
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="削除"
                  aria-label="削除"
                  className="text-destructive hover:text-destructive focus-visible:text-destructive"
                  onClick={() => handleDeleteDoc(selectedDoc)}
                >
                  <Trash2 />
                </Button>
              </div>
            </header>

            <div
              data-testid="document-scroll-area"
              className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto max-sm:pb-[calc(env(safe-area-inset-bottom)+5rem)]"
            >
              {mode === "edit" ? (
                loadedSelectedDoc ? (
                  <Textarea
                    value={editContent}
                    onChange={(e) => handleEditChange(e.target.value)}
                    placeholder="# Markdown を入力..."
                    className="h-full min-h-full resize-none rounded-none border-0 bg-card px-5 py-4 font-mono text-sm leading-relaxed shadow-none focus-visible:ring-0"
                  />
                ) : (
                  <DocumentLoadingState />
                )
              ) : (
                <div className="markdown-reading-surface">
                  {!loadedSelectedDoc ? (
                    <DocumentLoadingState compact />
                  ) : loadedSelectedDoc.content.trim() ? (
                    <MarkdownView content={loadedSelectedDoc.content} />
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
            <div className="flex size-16 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/80">
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
            ref={detailsPaneRef}
            data-testid="details-pane"
            className="flex min-h-0 min-w-[100dvw] shrink-0 snap-start flex-col gap-3 overflow-y-auto border-l border-border bg-card p-3 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] shadow-sm sm:min-w-0 sm:gap-5 sm:p-4 sm:pb-8"
            style={{ width: paneWidths.details }}
          >
            <div className="sticky top-0 z-10 -mx-3 -mt-3 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-2 shadow-2xs backdrop-blur sm:hidden">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-ml-1"
                aria-label="本文に戻る"
                onClick={() => scrollToMobilePane(documentPaneRef, "document")}
              >
                <ArrowLeft />
              </Button>
              <div className="min-w-0 flex-1">
                <span className="block text-[0.68rem] leading-none font-medium text-muted-foreground">
                  詳細
                </span>
                <span className="block truncate text-sm font-medium">
                  {selectedDoc.name}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                ファイル名
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {selectedDoc.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="名前を変更"
                  aria-label="ファイル名を変更"
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
                className="h-8 rounded-md border border-input bg-card/80 px-2 text-sm shadow-2xs transition-colors outline-none hover:border-ring/35 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/35"
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
                <dd>{formatWorkspaceDateTime(selectedDoc.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">更新</dt>
                <dd>{formatWorkspaceDateTime(selectedDoc.updatedAt)}</dd>
              </div>
            </dl>

            <DetailsActionGroup
              title="ファイル操作"
              icon={<FileText className="size-3.5" />}
            >
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
                disabled={!loadedSelectedDoc}
                onClick={() => {
                  if (loadedSelectedDoc) handleDownload(loadedSelectedDoc);
                }}
              >
                <Download />
                ダウンロード
              </Button>
            </DetailsActionGroup>

            <DetailsActionGroup
              title="共有"
              icon={<Share2 className="size-3.5" />}
              defaultOpen
            >
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
            </DetailsActionGroup>

            <DetailsActionGroup
              title="外部AIへ渡す"
              icon={<Sparkles className="size-3.5" />}
            >
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
                    disabled={!loadedSelectedDoc}
                    onClick={() => {
                      if (loadedSelectedDoc) {
                        handleAiHandoff(loadedSelectedDoc, service.url);
                      }
                    }}
                  >
                    <span>{service.label} を開く</span>
                    <ExternalLink className="size-3.5 text-muted-foreground" />
                  </Button>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                本文をコピーしてから外部AIを開きます。貼り付け（Ctrl+V /
                ⌘V）で渡せます。
              </p>
            </DetailsActionGroup>

            {loadedSelectedDoc ? (
              <AiAssistPanel
                key={loadedSelectedDoc.id}
                document={loadedSelectedDoc}
                demoMode={demoMode}
                onContentChange={handleAiContentChange}
                onError={setError}
              />
            ) : (
              <div className="flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground sm:pt-4">
                <Loader2 className="size-3.5 animate-spin" />
                本文読み込み後にアプリ内AIを使えます。
              </div>
            )}
          </aside>
        </>
      )}

      <nav
        data-testid="mobile-bottom-nav"
        className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-40 grid grid-cols-4 gap-1 rounded-lg border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur sm:hidden"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={mobileNavClass("files")}
          aria-label="ファイル一覧ペインを表示"
          aria-current={mobileView === "files" ? "page" : undefined}
          onClick={() => scrollToMobilePane(fileListPaneRef, "files")}
        >
          <FileText />
          一覧
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={mobileNavClass("document")}
          aria-label="本文ペインを表示"
          aria-current={mobileView === "document" ? "page" : undefined}
          disabled={!selectedDoc}
          onClick={() => scrollToMobilePane(documentPaneRef, "document")}
        >
          <Eye />
          本文
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={mobileNavClass("details")}
          aria-label="詳細ペインを表示"
          aria-current={mobileView === "details" ? "page" : undefined}
          disabled={!selectedDoc}
          onClick={() => scrollToMobilePane(detailsPaneRef, "details")}
        >
          <Share2 />
          詳細
        </Button>
        <a
          href={FEEDBACK_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="フィードバックを送る"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-11 px-2",
          )}
        >
          <MessageSquare />
          送信
        </a>
      </nav>

      <MobileActionSheet
        open={mobilePanel === "folders"}
        title="フォルダ"
        onClose={() => setMobilePanel(null)}
      >
        <div className="flex min-h-0 flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={handleCreateFolder}
          >
            <FolderPlus />
            フォルダを追加
          </Button>

          <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
            <MobileFolderRow
              active={selectedFolderId === "all"}
              icon={<Inbox className="size-4" />}
              label="すべてのファイル"
              count={documents.length}
              onSelect={() => {
                setSelectedFolderId("all");
                setMobilePanel(null);
              }}
            />
            {folders.map((folder) => (
              <MobileFolderRow
                key={folder.id}
                active={selectedFolderId === folder.id}
                icon={<FolderIcon className="size-4" />}
                label={folder.name}
                count={documents.filter((d) => d.folderId === folder.id).length}
                onSelect={() => {
                  setSelectedFolderId(folder.id);
                  setMobilePanel(null);
                }}
                onRename={() => handleRenameFolder(folder)}
                onDelete={() => handleDeleteFolder(folder)}
              />
            ))}
          </div>
        </div>
      </MobileActionSheet>

      <MobileActionSheet
        open={mobilePanel === "account"}
        title="アカウント"
        onClose={() => setMobilePanel(null)}
      >
        <div className="flex flex-col gap-3">
          {userSlot}
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "justify-start",
            )}
          >
            <MessageSquare />
            フィードバック
          </a>
        </div>
      </MobileActionSheet>

      <Dialog
        open={Boolean(textActionDialog)}
        onOpenChange={closeTextActionDialog}
      >
        <DialogContent className="gap-4 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{textActionTitle}</DialogTitle>
            <DialogDescription>{textActionDescription}</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitTextActionDialog();
            }}
          >
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{textActionInputLabel}</span>
              <Input
                autoFocus
                value={textActionValue}
                onChange={(event) => setTextActionValue(event.target.value)}
                placeholder={
                  textActionDialog?.type === "rename-document"
                    ? "例: meeting-notes.md"
                    : "例: 仕事メモ"
                }
              />
            </label>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => closeTextActionDialog(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={textActionDisabled}>
                {textActionSubmitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(confirmActionDialog)}
        onOpenChange={closeConfirmActionDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmActionTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmActionDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              variant={
                confirmActionDialog?.type === "disable-share"
                  ? "default"
                  : "destructive"
              }
              disabled={isPending}
              onClick={submitConfirmActionDialog}
            >
              {confirmActionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <div
          role="alert"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-1/2 z-50 flex max-w-md -translate-x-1/2 items-center gap-3 rounded-lg border border-destructive/20 bg-card px-4 py-2.5 text-sm text-destructive shadow-lg sm:bottom-4"
        >
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

function DocumentLoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        compact ? "py-2" : "h-full justify-center",
      )}
    >
      <Loader2 className="size-4 animate-spin" />
      本文を読み込んでいます。
    </div>
  );
}

function MobileActionSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 sm:hidden">
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 bg-foreground/20"
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col gap-3 rounded-t-xl border border-border bg-popover p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-popover-foreground shadow-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="閉じる"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </section>
    </div>
  );
}

function DetailsActionGroup({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="flex flex-col border-t border-border/80 pt-3 sm:pt-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-mx-2 justify-between px-2"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-1.5">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </Button>
      {open && <div className="mt-2 flex flex-col gap-2">{children}</div>}
    </section>
  );
}

function MobileFolderRow({
  active,
  icon,
  label,
  count,
  onSelect,
  onRename,
  onDelete,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onSelect: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all",
        active
          ? "bg-accent text-accent-foreground shadow-xs ring-1 ring-border/70"
          : "focus-within:bg-muted/80 hover:bg-muted/80",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="truncate">{label}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {count}
        </span>
      </button>
      {(onRename || onDelete) && (
        <div className="flex shrink-0 items-center gap-0.5">
          {onRename && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${label} の名前を変更`}
              onClick={onRename}
            >
              <Pencil />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`${label} を削除`}
              className="text-destructive hover:text-destructive"
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
      className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-transparent transition-colors outline-none hover:bg-accent focus-visible:bg-accent sm:flex"
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
        "group/folder flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-xs ring-1 ring-sidebar-border/80"
          : "hover:bg-sidebar-accent/60",
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
              type="button"
              variant="ghost"
              size="icon-xs"
              title="名前を変更"
              aria-label={`${label} の名前を変更`}
              onClick={onRename}
            >
              <Pencil />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="削除"
              aria-label={`${label} を削除`}
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
