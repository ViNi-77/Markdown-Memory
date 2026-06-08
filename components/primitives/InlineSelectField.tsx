"use client";

/**
 * InlineSelectField — Pane 4 編集 UI の「固定リスト Select」プリミティブ。
 *
 * shadcn `<Select>` をラップし、ComboOption ベースの `<InlineComboboxField>` よりも
 * 軽量な「固定 N 択」の場面で使う:
 *   - `string[]` だけ渡せば良い（`{ value, description }` 構造は不要）
 *   - 新規追加機能は持たない（候補者個別に増やす想定がない場合に使う）
 *   - SelectTrigger 素体（`border-input` + `h-8`）に `bg-card` + `w-full` +
 *     `hover:bg-accent/40` を加えて他の InlineXxxField と完全に揃える
 *
 * 雛形では「形式（書類 / オンライン / オフライン）」「判定（通過 / 保留 / 不合格）」
 * のような選考ステージのメタ情報フィールドで再利用される。
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type InlineSelectFieldProps = {
  /** 現在の値（空文字で placeholder 表示） */
  value: string;
  /** 選択肢（順序が表示順、`readonly` 配列も受け取る） */
  options: readonly string[];
  /** 選択時に呼ばれる */
  onSave: (v: string) => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
  /** 空のときの placeholder。デフォルト "選択..." */
  placeholder?: string;
};

export function InlineSelectField({
  value,
  options,
  onSave,
  ariaLabel,
  placeholder = "選択...",
}: InlineSelectFieldProps) {
  return (
    <Select
      value={value === "" ? undefined : value}
      onValueChange={(v) => onSave(v ?? "")}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className="h-8 w-full bg-card hover:bg-accent/40"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
