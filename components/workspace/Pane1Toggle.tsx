"use client";

/**
 * Pane 1 折りたたみトグル。shadcn/ui の SidebarTrigger は単一の `PanelLeft`
 * アイコンを使うが、本プロジェクトでは「畳むのか / 開くのか」を一目で伝える
 * ために `PanelLeftClose` / `PanelLeftOpen` を `state` で切り替えている。
 *
 * - 表示位置: Pane 1 ヘッダー右端（展開時） / Pane 1 ヘッダー中央（畳時 = rail 上部）
 * - キーボード: Cmd+B / Ctrl+B（shadcn 標準、`SidebarProvider` 側で実装）
 * - shadcn 素体（`components/ui/sidebar.tsx`）は触らず、独自トグルとしてラップする
 *
 * 仕様の出典:
 *   - openspec/decision/0006-... §5「Pane 1 折りたたみトグルは
 *     `PanelLeftClose` / `PanelLeftOpen` を state で切替」（本実装で追記）
 */

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type Pane1ToggleProps = {
  className?: string;
};

export function Pane1Toggle({ className }: Pane1ToggleProps) {
  const { state, toggleSidebar } = useSidebar();
  const isExpanded = state === "expanded";
  const Icon = isExpanded ? PanelLeftClose : PanelLeftOpen;
  const label = isExpanded ? "Pane 1 を閉じる" : "Pane 1 を開く";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleSidebar}
      aria-label={label}
      title={`${label}（⌘B）`}
      className={cn("size-7 text-sidebar-foreground", className)}
    >
      <Icon />
    </Button>
  );
}
