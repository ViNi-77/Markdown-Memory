"use client";

/**
 * InlineTextareaField — Pane 4 編集 UI の「複数行 textarea」プリミティブ。
 *
 * shadcn `<Textarea>` をラップし、Lab v3 で確定した規律で編集体験を統一する:
 *   - 常に `<Textarea>` 表示（Type-direct、ADR-0014）
 *   - `bg-card` で周囲（bg-background）より明るく「手前」感を出す
 *   - `field-sizing: content`（Tailwind v4 / shadcn v4 の textarea デフォルト）で内容に応じて自動リサイズ
 *   - 保存: blur で onSave 発火（値が変わっていれば）。Cmd+Enter で blur
 *   - キャンセル: Esc で defaultValue に戻して blur
 *
 * 雛形では「職務経歴」「志望動機」のような長文項目で再利用。
 */

import { Textarea } from "@/components/ui/textarea";

export type InlineTextareaFieldProps = {
  /** 現在の値（空文字で「未設定」placeholder 表示） */
  value: string;
  /** 値が変わって blur した時に呼ばれる */
  onSave: (v: string) => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
  /** 空のときの placeholder。デフォルト "未設定" */
  placeholder?: string;
};

export function InlineTextareaField({
  value,
  onSave,
  ariaLabel,
  placeholder,
}: InlineTextareaFieldProps) {
  return (
    <Textarea
      defaultValue={value}
      placeholder={placeholder ?? "未設定"}
      aria-label={ariaLabel}
      onBlur={(e) => {
        if (e.target.value !== value) onSave(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          (e.target as HTMLTextAreaElement).blur();
        } else if (e.key === "Escape") {
          (e.target as HTMLTextAreaElement).value = value;
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className="min-h-24 bg-card leading-relaxed whitespace-pre-line"
    />
  );
}
