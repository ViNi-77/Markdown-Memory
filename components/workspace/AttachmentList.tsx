"use client";

/**
 * 添付ファイル一覧（Pane 4 モード 2 の「提出書類 / 文字起こし」共通リスト）。
 *
 * ADR-0010 §13 D75 で「添付セクションは Attachment 統一型のファイル一覧」に統合。
 * 旧「提出書類は PDF リスト / 文字起こしはテキスト塊」の二分岐を廃止し、
 * 両ステージで同じ AttachmentList を使う。
 *
 * 行のマークアップ規律（レビュー反映）:
 * - `<li>` 自体には role / onClick を持たせない（ネスト button を回避、WAI-ARIA APG 準拠）
 * - `<li>` 内に **兄弟関係の native `<button>` 2 つ** を配置:
 *   1. プレビュー用ワイドボタン（kind: "txt" のときのみ有効、kind: "pdf" は disabled）
 *   2. ダウンロード用アイコンボタン（常に有効、stopPropagation 不要）
 * - `focus-within:ring-2` で行全体の focus 可視化
 * - PDF 行は `disabled` + 「プレビュー不可」バッジで「クリックしても開かない」を明示
 *
 * 状態管理規律（ADR-0010 §6/§7/§8 準拠）:
 * - `openItem` state は本コンポーネント内 useState で持つ
 * - 候補者・ステージ切替は親 (CandidateDetailPane) 側の
 *   `key={selectedCandidateId}-${stage}` でツリー再マウントされ、モーダルも自然に閉じる
 * - useEffect 内で setOpenItem(null) するパターンは MUST 禁止
 *
 * ダミー DL は `console.info("[stub] download:", file.id)` の observable stub
 * （noop 禁止、雛形教材として「動いている」ことを受講生に示す）。
 */

import { useState } from "react";
import { Download, FileText } from "lucide-react";

import { type Attachment } from "@/lib/schema";
import { Separator } from "@/components/ui/separator";
import { AttachmentPreviewDialog } from "@/components/workspace/AttachmentPreviewDialog";

export function AttachmentList({ items }: { items: Attachment[] }) {
  const [openItem, setOpenItem] = useState<Attachment | null>(null);

  if (items.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-muted-foreground">
        添付はまだありません。ヘッダーの「アップロード」から追加できます。
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        {items.map((file) => {
          const isTxt = file.kind === "txt";
          return (
            <li
              key={file.id}
              className="flex items-stretch overflow-hidden rounded-lg border border-border bg-card transition"
            >
              {/* 兄弟 button 1: プレビュー（PDF は disabled） */}
              <button
                type="button"
                onClick={() => {
                  if (isTxt) {
                    setOpenItem(file);
                  }
                }}
                disabled={!isTxt}
                aria-label={
                  isTxt
                    ? `${file.name} のプレビューを開く`
                    : `${file.name}（プレビュー不可）`
                }
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-3 py-2.5 text-left transition outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:hover:bg-transparent"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm text-foreground">
                  {file.name}
                </span>
                {!isTxt && (
                  <span className="ml-1 shrink-0 rounded border border-border px-1 text-[10px] text-muted-foreground">
                    プレビュー不可
                  </span>
                )}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                  {file.size}
                </span>
              </button>

              <Separator orientation="vertical" aria-hidden />

              {/* 兄弟 button 2: ダウンロード（独立コントロール、stopPropagation 不要） */}
              <button
                type="button"
                onClick={() => console.info("[stub] download:", file.id)}
                aria-label={`${file.name} をダウンロード`}
                className="flex shrink-0 items-center px-2.5 transition outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <Download className="size-3.5 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
      <AttachmentPreviewDialog
        item={openItem}
        onOpenChange={(open) => {
          if (!open) {
            setOpenItem(null);
          }
        }}
      />
    </>
  );
}
