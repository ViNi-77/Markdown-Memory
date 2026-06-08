"use client";

/**
 * 添付ファイル中身プレビューモーダル（Pane 4 モード 2 / AttachmentList から開く）。
 *
 * - shadcn Dialog 公式構造（Title / Description / Header / ScrollArea）に揃える
 * - WAI-ARIA Modal Dialog Pattern: aria-labelledby（Title 自動接続）+ aria-describedby
 *   （Description 自動接続）+ Esc 閉じ + focus 戻し（Base UI Dialog で標準提供）
 * - txt は本文を whitespace-pre-wrap で表示。font-mono は使わず、日本語長文の
 *   可読性を優先（ADR-0010 §13 D75 / レビュー反映）
 * - PDF はそもそも `AttachmentList` 側で `disabled` のためモーダルが開かない。
 *   この Dialog では PDF 分岐を持たない（YAGNI、PDF プレビューは雛形外）
 *
 * ADR 出典: ADR-0010 §13 / design.md D75
 */

import { Download } from "lucide-react";

import { type Attachment } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AttachmentPreviewDialog({
  item,
  onOpenChange,
}: {
  item: Attachment | null;
  onOpenChange: (open: boolean) => void;
}) {
  // モーダルは「txt の Attachment」専用。PDF は親側で disabled されているため
  // ここに到達しない前提だが、型安全のため item?.kind === "txt" でガードする。
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col gap-3">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle className="truncate">{item?.name ?? ""}</DialogTitle>
            {item && (
              <Button
                variant="outline"
                size="xs"
                aria-label={`${item.name} をダウンロード`}
                onClick={() => console.info("[stub] download:", item.id)}
                className="shrink-0"
              >
                <Download data-icon="inline-start" />
                ダウンロード
              </Button>
            )}
          </div>
          <DialogDescription>
            Esc キーまたは右上 × で閉じます。
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="-mx-1 min-h-0 flex-1 px-1">
          {item?.kind === "txt" ? (
            <div className="py-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {item.previewText}
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
