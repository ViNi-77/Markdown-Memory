/**
 * Pane 4 編集 UI 用の inline 編集プリミティブ群（shadcn 標準フォームベース）。
 *
 * ADR-0014「shadcn 標準フォームによる Pane 4 編集 UI」で確定:
 *   - 旧 ADR-0010 §6 D R5「shadcn Input/Textarea MUST 禁止」を撤回
 *   - 鉛筆アイコン式・編集ボタン式は引き続き禁止（ADR-0014 で明文化）
 *   - 全フィールドが常に shadcn の Input / Textarea / Calendar / Combobox で表示される
 *
 * 利用例:
 *   import { InlineTextField } from "@/components/primitives";
 *   <InlineTextField value={...} onSave={...} ariaLabel="..." />
 */

export { InlineTextField } from "./InlineTextField";
export type { InlineTextFieldProps } from "./InlineTextField";

export { InlineDateField } from "./InlineDateField";
export type { InlineDateFieldProps } from "./InlineDateField";

export { InlineComboboxField } from "./InlineComboboxField";
export type {
  ComboOption,
  InlineComboboxFieldProps,
} from "./InlineComboboxField";

export { InlineSelectField } from "./InlineSelectField";
export type { InlineSelectFieldProps } from "./InlineSelectField";

export { InlineTextareaField } from "./InlineTextareaField";
export type { InlineTextareaFieldProps } from "./InlineTextareaField";

export { SectionLabel, sectionLabelVariants } from "./SectionLabel";

export { InlineFieldRow } from "./InlineFieldRow";
export type { InlineFieldRowProps } from "./InlineFieldRow";

export { ScoreLabel } from "./ScoreLabel";
export type { ScoreLabelProps } from "./ScoreLabel";
