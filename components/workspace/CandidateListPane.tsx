"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Star,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import {
  type CandidateRow,
  type Group,
  type StageKey,
} from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { SortableCandidateRow } from "@/components/workspace/SortableCandidateRow";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { STAGE_LABELS } from "@/lib/labels";

// dnd-kit のスクリーンリーダー向け日本語化。
const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Space または Enter で候補者を持ち上げ、矢印キーで移動、Space で確定、Esc でキャンセルします。",
};

type CandidateListPaneProps = {
  groups: Group[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddCandidate: (stage: StageKey, name: string) => void;
  onArchiveCandidate: (id: string) => void;
  onRestoreCandidate: (id: string) => void;
  onMoveCandidate: (id: string, toStage: StageKey, toIndex: number) => void;
};

export function CandidateListPane({
  groups,
  selectedCandidateId,
  onSelectCandidate,
  onAddCandidate,
  onArchiveCandidate,
  onRestoreCandidate,
  onMoveCandidate,
}: CandidateListPaneProps) {
  const [addDialogStage, setAddDialogStage] = useState<{
    stage: StageKey;
    label: string;
  } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // PointerSensor の distance 制約で「クリック」と「ドラッグ」を区別する
  // （6px 以上動かさないとドラッグ起動しない → 行クリック / メニュー操作と衝突しない）。
  // KeyboardSensor は Tab 移動 → Space で持ち上げ → 矢印で移動 → Enter で確定。
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const stageGroups = groups.filter(
    (g): g is Extract<Group, { kind: "stage" }> => g.kind === "stage",
  );
  const archivedGroup = groups.find(
    (g): g is Extract<Group, { kind: "archived" }> => g.kind === "archived",
  );

  // ドラッグ中の浮遊行表示用に元データを引く
  const activeDragRow: { row: CandidateRow; stage: StageKey } | null = (() => {
    if (!activeDragId) return null;
    for (const g of stageGroups) {
      const row = g.items.find((r) => r.id === activeDragId);
      if (row) return { row, stage: g.stage };
    }
    return null;
  })();

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const name = (active.data.current?.name as string | undefined) ?? "候補者";
      return `${name}を持ち上げました。`;
    },
    onDragOver: ({ active, over }) => {
      const name = (active.data.current?.name as string | undefined) ?? "候補者";
      if (!over) return `${name}を移動中です。`;
      const overContainer = over.data.current?.containerId as
        | StageKey
        | undefined;
      if (overContainer)
        return `${name}を「${STAGE_LABELS[overContainer]}」の上に移動しました。`;
      return `${name}を移動中です。`;
    },
    onDragEnd: ({ active, over }) => {
      const name = (active.data.current?.name as string | undefined) ?? "候補者";
      if (!over) return `${name}の移動をキャンセルしました。`;
      const overContainer =
        (over.data.current?.containerId as StageKey | undefined) ??
        (typeof over.id === "string" &&
        stageGroups.some((g) => g.stage === over.id)
          ? (over.id as StageKey)
          : undefined);
      if (!overContainer) return `${name}を確定しました。`;
      return `${name}を「${STAGE_LABELS[overContainer]}」に移動しました。`;
    },
    onDragCancel: ({ active }) => {
      const name = (active.data.current?.name as string | undefined) ?? "候補者";
      return `${name}の移動をキャンセルしました。`;
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeContainer = active.data.current?.containerId as
      | StageKey
      | undefined;
    // over の所属コンテナは、要素ドロップなら data.current.containerId、
    // SortableContext そのものへのドロップなら over.id（= "stage" のキー）。
    const overContainer =
      (over.data.current?.containerId as StageKey | undefined) ??
      (typeof over.id === "string" &&
      stageGroups.some((g) => g.stage === over.id)
        ? (over.id as StageKey)
        : undefined);

    if (!activeContainer || !overContainer) return;

    const targetGroup = stageGroups.find((g) => g.stage === overContainer);
    if (!targetGroup) return;

    let toIndex: number;
    if (active.id === over.id) return;

    const overIndexInTarget = targetGroup.items.findIndex(
      (r) => r.id === over.id,
    );
    if (overIndexInTarget >= 0) {
      // 同コンテナ内: active を一旦取り除いた後の index を保つため、
      // active が同コンテナ内で over より前にあれば overIndexInTarget はそのまま、
      // 後ろなら -1 ずれる、という自然な算出になる。Workspace.moveCandidate 側で
      // active を除いた配列上で挿入するため、ここでは単純に over の現 index を渡す。
      toIndex = overIndexInTarget;
    } else {
      // 空コンテナ・末尾領域へのドロップ: 末尾に追加
      toIndex = targetGroup.items.length;
    }

    onMoveCandidate(String(active.id), overContainer, toIndex);
  };

  return (
    <section className="flex w-[280px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          フロントエンドエンジニア
        </h2>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <DndContext
          // 固定 id を渡して SSR/CSR 間の `aria-describedby` 採番ズレ
          // （DndDescribedBy-N の連番）による hydration mismatch を回避する
          id="pane2-candidate-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{ announcements, screenReaderInstructions }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div className="flex flex-col gap-5 px-3 py-4">
            {stageGroups.map((group) => (
              <StageGroup
                key={`stage:${group.stage}`}
                stage={group.stage}
                label={group.label}
                items={group.items}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={onSelectCandidate}
                onAddRequest={() =>
                  setAddDialogStage({
                    stage: group.stage,
                    label: group.label,
                  })
                }
                onArchiveRequest={(id, name) =>
                  setArchiveTarget({ id, name })
                }
              />
            ))}
            {archivedGroup && (
              <ArchivedGroup
                label={archivedGroup.label}
                items={archivedGroup.items}
                open={archivedOpen}
                onOpenChange={setArchivedOpen}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={onSelectCandidate}
                onRestore={onRestoreCandidate}
              />
            )}
          </div>
          <DragOverlay>
            {activeDragRow && (
              <div className="flex items-center gap-2 rounded-md bg-accent px-2.5 py-2.5 text-accent-foreground shadow-lg">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {activeDragRow.row.name[0] ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{activeDragRow.row.name}</p>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      {addDialogStage && (
        <AddItemDialog
          open={addDialogStage !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialogStage(null);
          }}
          title="候補者を追加"
          description={`「${addDialogStage.label}」ステージに候補者を追加します`}
          fieldLabel="氏名"
          fieldId="candidate-name"
          placeholder="例: 山田 太郎"
          onAdd={(name) => onAddCandidate(addDialogStage.stage, name)}
        />
      )}

      <DeleteConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title="候補者をアーカイブしますか？"
        itemName={archiveTarget?.name ?? ""}
        description={`「${archiveTarget?.name ?? ""}」をアーカイブします。後で「アーカイブ済み」から復元できます。`}
        actionLabel="アーカイブ"
        onConfirm={() => {
          if (archiveTarget) {
            onArchiveCandidate(archiveTarget.id);
            setArchiveTarget(null);
          }
        }}
      />
    </section>
  );
}

function StageGroup({
  stage,
  label,
  items,
  selectedCandidateId,
  onSelectCandidate,
  onAddRequest,
  onArchiveRequest,
}: {
  stage: StageKey;
  label: string;
  items: CandidateRow[];
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onAddRequest: () => void;
  onArchiveRequest: (id: string, name: string) => void;
}) {
  // 空ステージでもドロップを受け取れるようにする（最後の 1 名を別ステージへ
  // 動かした後の戻し先を保つため、ステージは常時表示）。
  // SortableContext id (= stage) は要素の並び替え用、useDroppable id は
  // 「コンテナ自体」の drop ターゲット用。両者を分けることで衝突を避ける。
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone:${stage}`,
    data: { containerId: stage },
  });

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between gap-2 bg-background px-5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </h3>
          <Badge variant="secondary" size="xs">
            {items.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onAddRequest}
          aria-label={`${label} に候補者を追加`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <SortableContext
        id={stage}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          data-stage={stage}
          className={cn(
            "flex flex-col gap-1",
            items.length === 0 && "min-h-12 rounded-md border border-dashed border-border/70 p-2",
            items.length === 0 && isOver && "border-primary/60 bg-primary/5",
          )}
        >
          {items.length === 0 ? (
            <li
              className={cn(
                "pointer-events-none flex h-8 items-center justify-center text-xs",
                isOver ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              ここへドラッグ
            </li>
          ) : (
            items.map((cand) => (
              <SortableCandidateRow
                key={cand.id}
                cand={cand}
                stage={stage}
                selected={cand.id === selectedCandidateId}
                onSelect={onSelectCandidate}
                actions={
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onArchiveRequest(cand.id, cand.name)}
                  >
                    <Archive />
                    アーカイブ
                  </DropdownMenuItem>
                }
              />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

function ArchivedGroup({
  label,
  items,
  open,
  onOpenChange,
  selectedCandidateId,
  onSelectCandidate,
  onRestore,
}: {
  label: string;
  items: CandidateRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCandidateId: string;
  onSelectCandidate: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "group/archived-trigger sticky top-0 z-10 -mx-3 mb-2 flex cursor-pointer items-center justify-between gap-2 bg-background px-5 py-1.5",
              "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          />
        }
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </h3>
          <Badge variant="secondary" size="xs">
            {items.length}
          </Badge>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-[color,transform] group-hover/archived-trigger:text-foreground in-data-[panel-open]:rotate-180"
        />
        <span className="sr-only">{`${label}を開く`}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1" data-stage="archived">
          {items.map((cand) => (
            <ArchivedRowItem
              key={cand.id}
              cand={cand}
              selected={cand.id === selectedCandidateId}
              onSelect={onSelectCandidate}
              onRestore={onRestore}
            />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ArchivedRowItem({
  cand,
  selected,
  onSelect,
  onRestore,
}: {
  cand: CandidateRow;
  selected: boolean;
  onSelect: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <li className="group/candidate relative">
      <button
        type="button"
        onClick={() => onSelect(cand.id)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected
            ? "bg-accent text-accent-foreground"
            : "text-foreground hover:bg-muted",
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs text-primary">
            {cand.name[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{cand.name}</p>
        </div>
        <span className="transition-opacity group-focus-within/candidate:opacity-0 group-hover/candidate:opacity-0">
          <ScoreBadge avg={cand.averageScore} selected={selected} />
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "absolute top-1/2 right-1 -translate-y-1/2",
                "opacity-0 group-focus-within/candidate:opacity-100 group-hover/candidate:opacity-100",
                "transition-opacity",
                "text-muted-foreground hover:text-foreground",
              )}
              aria-label={`${cand.name} の操作`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => onRestore(cand.id)}>
              <ArchiveRestore />
              復元
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function ScoreBadge({
  avg,
  selected,
}: {
  avg: number | null;
  selected: boolean;
}) {
  if (avg === null) {
    return (
      <span
        className={cn(
          "shrink-0 text-xs",
          selected ? "text-accent-foreground/80" : "text-muted-foreground",
        )}
        aria-label="未評価"
      >
        —
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums",
        selected ? "text-accent-foreground" : "text-foreground/80",
      )}
      aria-label={`平均スコア ${avg.toFixed(1)} / 5`}
    >
      <Star aria-hidden className="size-3 fill-current" />
      {avg.toFixed(1)}
    </span>
  );
}
