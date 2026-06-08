"use client";

/**
 * InlineComboboxField — Pane 4 編集 UI の「検索 + 選択 + 新規追加」プリミティブ。
 *
 * shadcn 公式 Combobox パターン:
 *   - `<Popover>` + `<Command>` の組み合わせ
 *   - 各オプションに `value`（ラベル）と `description`（説明）を持つ
 *   - CommandInput で検索（`shouldFilter` ON）
 *   - 検索クエリにマッチがない場合は「+ 「X」を追加」ボタンで新規オプション作成可
 *   - トリガーの chrome は他フィールドと統一（border-input + bg-card）
 *   - 選択中アイテムは `data-checked` で shadcn 標準の CheckIcon を表示
 *
 * 雛形では「応募経路」（Wantedly / LinkedIn / 社員リファラル / 直接応募 / etc.）で再利用。
 * オプション集合は外部 state で管理し、`onCreate` を経由して追加する。
 */

import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Combobox の選択肢。`value` は ID 兼ラベル、`description` は補助説明。 */
export type ComboOption = {
  value: string;
  description: string;
};

export type InlineComboboxFieldProps = {
  /** 現在選択中の値（`options[].value` のいずれか、または空文字） */
  value: string;
  /** 選択肢リスト（順序が表示順） */
  options: ComboOption[];
  /** 選択時に呼ばれる */
  onSave: (v: string) => void;
  /** 「+ 追加」が押されたときに呼ばれる。新オプション追加 + 選択は呼び出し側の責務 */
  onCreate: (newOpt: ComboOption) => void;
  /** スクリーンリーダー向けラベル */
  ariaLabel: string;
  /** トリガーの空表示 placeholder。デフォルト "選択..." */
  placeholder?: string;
  /** Command 検索 input の placeholder。デフォルト "検索または追加..." */
  searchPlaceholder?: string;
};

export function InlineComboboxField({
  value,
  options,
  onSave,
  onCreate,
  ariaLabel,
  placeholder = "選択...",
  searchPlaceholder = "検索または追加...",
}: InlineComboboxFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const exactMatch = options.find((o) => o.value === trimmed);
  const showCreate = trimmed !== "" && !exactMatch;

  const handleCreate = () => {
    const newOpt: ComboOption = {
      value: trimmed,
      description: "（新規追加）",
    };
    onCreate(newOpt);
    onSave(newOpt.value);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger
        aria-label={ariaLabel}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-card px-2.5 py-1 text-left text-sm text-foreground transition-colors outline-none hover:bg-accent/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:border-ring data-popup-open:ring-3 data-popup-open:ring-ring/50"
      >
        <span className="truncate">
          {value || (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty className="p-1">
              {showCreate ? (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-primary hover:bg-muted"
                >
                  <Plus className="size-4" />「{trimmed}」を追加
                </button>
              ) : (
                <span className="block py-3 text-center text-sm text-muted-foreground">
                  候補なし
                </span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  data-checked={value === opt.value || undefined}
                  onSelect={() => {
                    onSave(opt.value);
                    setOpen(false);
                  }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-medium">{opt.value}</span>
                    <span className="truncate text-xs text-muted-foreground group-data-selected/command-item:text-foreground/70">
                      {opt.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
