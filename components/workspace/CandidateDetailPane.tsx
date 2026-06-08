"use client";

/**
 * Pane 4: 選考ステージ詳細パネル（ADR-0015 §19 でモード 1 を廃止）。
 *
 * ステージ詳細のみ表示する。候補者詳細（旧モード 1）は Pane 3 のヘッダー帯
 * トグル内に移管済み。起動時は畳まれた 48px 帯で、Pane 3 のステージカード
 * クリックで自動展開する。
 *
 * 規律:
 *   - components/primitives/ の Inline* primitive を使う（shadcn 標準フォーム）
 *   - AttachmentList を再利用（添付セクション）
 *   - AxisScoreRow を CandidateDashboardPane から import
 *   - ステージ切替時の state リセットは `key` 再マウントで
 *
 * `SelectedDetail` 型は `lib/schema.ts` に集約（Phase 3A）。
 */

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { Pane4Toggle } from "@/components/workspace/Pane4Toggle";

import {
  type AxisKey,
  type StageKey,
  type Scorecard,
  type SelectedDetail,
  AXIS_ORDER,
} from "@/lib/schema";
import { EVALUATION_AXIS, PANE4_SECTION_IDS } from "@/lib/labels";
import { createMinimalScorecard } from "@/lib/data/factories";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  InlineDateField,
  InlineSelectField,
  InlineComboboxField,
  InlineTextareaField,
  InlineFieldRow,
  type ComboOption,
} from "@/components/primitives";
import { Pane4Section } from "@/components/workspace/Pane4Section";
import { AxisScoreRow } from "@/components/workspace/CandidateDashboardPane";
import { AttachmentList } from "@/components/workspace/AttachmentList";

// ===== Pane 4 内部型（ファイル外には出さない） =====

/**
 * Pane 4 モード 2 で inline 編集できる Scorecard のキー集合。
 * `onUpdateScorecardField` の `field` 引数の型として親 (Workspace.tsx) と整合させる。
 *
 * 旧実装は `date / format / interviewer / decision` の 4 フィールドのみだったが、
 * ADR-0014 でコメント / 要約も `InlineTextareaField` で編集対象にしたため
 * `comment` / `summary` を追加した。Workspace.tsx 側の `EditableScorecardKey`
 * 再宣言も同形に揃える必要がある（型を export しない設計のため両側で宣言する規律）。
 */
type EditableScorecardKey =
  | "date"
  | "format"
  | "interviewer"
  | "decision"
  | "comment"
  | "summary";

// ===== 定数（screening-lab / profile-card-lab から移植） =====

const FORMAT_OPTIONS = [
  "書類",
  "オンライン (Google Meet)",
  "オフライン",
] as const;

const DECISION_OPTIONS = ["通過", "保留", "不合格"] as const;

const INITIAL_INTERVIEWER_OPTIONS: ComboOption[] = [
  { value: "田中 花子", description: "採用担当チーム" },
  { value: "佐藤 太郎", description: "エンジニアリングマネージャー" },
  { value: "鈴木 一郎", description: "シニアエンジニア" },
  { value: "山田 美咲", description: "プロダクトマネージャー" },
];

// ===== 選考ステージ詳細（旧モード 2、ADR-0015 で唯一のモードに） =====

/**
 * モード 2（選考ステージ詳細、書類選考 / 面接 共通テンプレート）。
 * 基本情報 / 評価 / コメント / 要約 / 添付 の 5 ブロック構成（screening-lab と一致）。
 *
 * ステージ別ラベル分岐（ADR-0010 §9 G）:
 *   - 「面接官」フィールド: 書類選考のみ「審査担当」、それ以外は「面接官」
 *   - 「要約」見出し: 書類選考のみ「書類の要約」、それ以外は「面接の要約」
 *   - 「添付」見出し: 書類選考のみ「提出書類」、それ以外は「添付」
 *
 * 各フィールドは `components/primitives/` の Inline* primitive で常時表示される
 * （Type-direct）。`interviewerOptions` は候補者+ステージ単位でメモリ保持し、
 * 親側 `key` でステージ・候補者切替時に自然リセット（Effect 内同期 setState 禁止）。
 */
function Mode2StageDetail({
  scorecard,
  onUpdateAxis,
  onUpdateScorecardField,
}: {
  scorecard: Scorecard;
  onUpdateAxis: (stage: StageKey, axis: AxisKey, value: number | null) => void;
  onUpdateScorecardField: (
    stage: StageKey,
    field: EditableScorecardKey,
    value: string,
  ) => void;
}) {
  const isScreening = scorecard.stage === "screening";
  const interviewerLabel = isScreening ? "審査担当" : "面接官";
  const summaryHeading = isScreening ? "書類の要約" : "面接の要約";
  const attachmentHeading = isScreening ? "提出書類" : "添付";

  const [interviewerOptions, setInterviewerOptions] = useState<ComboOption[]>(
    INITIAL_INTERVIEWER_OPTIONS,
  );

  const handleAddInterviewer = (newOpt: ComboOption) =>
    setInterviewerOptions((prev) =>
      prev.find((o) => o.value === newOpt.value) ? prev : [...prev, newOpt],
    );

  return (
    <div>
      {/* 基本情報（日時 / 形式 / 面接官 / 判定） */}
      <Pane4Section id={PANE4_SECTION_IDS.m2.info} title="基本情報">
        <dl className="flex flex-col gap-2.5 text-sm">
          <InlineFieldRow label="日時">
            <InlineDateField
              value={scorecard.date}
              onSave={(v) => onUpdateScorecardField(scorecard.stage, "date", v)}
              ariaLabel="日時"
            />
          </InlineFieldRow>

          <InlineFieldRow label="形式">
            <InlineSelectField
              value={scorecard.format}
              options={FORMAT_OPTIONS}
              onSave={(v) =>
                onUpdateScorecardField(scorecard.stage, "format", v)
              }
              ariaLabel="形式"
            />
          </InlineFieldRow>

          <InlineFieldRow label={interviewerLabel}>
            <InlineComboboxField
              value={scorecard.interviewer}
              options={interviewerOptions}
              onSave={(v) =>
                onUpdateScorecardField(scorecard.stage, "interviewer", v)
              }
              onCreate={handleAddInterviewer}
              ariaLabel={interviewerLabel}
            />
          </InlineFieldRow>

          <InlineFieldRow label="判定">
            <InlineSelectField
              value={scorecard.decision ?? ""}
              options={DECISION_OPTIONS}
              onSave={(v) =>
                onUpdateScorecardField(scorecard.stage, "decision", v)
              }
              ariaLabel="判定"
            />
          </InlineFieldRow>
        </dl>
      </Pane4Section>

      <Separator />

      {/* 評価（4 観点 ★、編集可能。★ クリックで値設定 / × でリセット） */}
      <Pane4Section id={PANE4_SECTION_IDS.m2.evaluation} title="評価">
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-3">
          {AXIS_ORDER.map((key) => (
            <AxisScoreRow
              key={key}
              label={EVALUATION_AXIS[key]}
              value={scorecard.axisScores[key]}
              editable
              onChange={(v) => onUpdateAxis(scorecard.stage, key, v)}
              onReset={() => onUpdateAxis(scorecard.stage, key, null)}
            />
          ))}
        </div>
      </Pane4Section>

      <Separator />

      {/* 担当者のコメント（textarea） */}
      <Pane4Section
        id={PANE4_SECTION_IDS.m2.comment}
        title="担当者のコメント"
        className="gap-2"
      >
        <InlineTextareaField
          value={scorecard.comment ?? ""}
          onSave={(v) => onUpdateScorecardField(scorecard.stage, "comment", v)}
          ariaLabel="担当者のコメント"
        />
      </Pane4Section>

      <Separator />

      {/* 要約（書類選考: 書類の要約 / 面接: 面接の要約） */}
      <Pane4Section
        id={PANE4_SECTION_IDS.m2.summary}
        title={summaryHeading}
        className="gap-2"
      >
        <InlineTextareaField
          value={scorecard.summary ?? ""}
          onSave={(v) => onUpdateScorecardField(scorecard.stage, "summary", v)}
          ariaLabel={summaryHeading}
        />
      </Pane4Section>

      <Separator />

      {/* 添付（書類選考: 提出書類 / 面接: 添付）— `AttachmentList` を再利用 */}
      <Pane4Section
        id={PANE4_SECTION_IDS.m2.attachments}
        title={attachmentHeading}
      >
        <AttachmentList items={scorecard.attachments} />
      </Pane4Section>
    </div>
  );
}

// ===== Pane 4 メイン =====

/**
 * Pane 4: 選考ステージ詳細パネル（ADR-0015 §19 で候補者詳細を Pane 3 に移管）。
 *
 * - ヘッダー: ステージ名 + Pane4Toggle の 2 要素（◀ は撤廃）
 * - ステージ切替: `<Mode2StageDetail key={...}>` で再マウント
 * - ステージ未選択時（selectedDetail === null 想定、Phase 3C 暫定で type=profile も
 *   ステージなしとして扱う）: コンテンツなし、ヘッダーのみ
 */
export function CandidateDetailPane({
  selectedCandidateId,
  scorecards,
  selectedDetail,
  scrollAnchor,
  onScrollAnchorConsumed,
  onUpdateAxis,
  onUpdateScorecardField,
  pane4Open,
  onTogglePane4,
}: {
  selectedCandidateId: string;
  scorecards: Scorecard[];
  selectedDetail: SelectedDetail;
  scrollAnchor: string | null;
  onScrollAnchorConsumed: () => void;
  onUpdateAxis: (stage: StageKey, axis: AxisKey, value: number | null) => void;
  onUpdateScorecardField: (
    stage: StageKey,
    field: EditableScorecardKey,
    value: string,
  ) => void;
  pane4Open: boolean;
  onTogglePane4: () => void;
}) {
  useEffect(() => {
    if (!scrollAnchor) return;
    // 1 フレーム待つのは、Pane 4 が閉状態 → 開状態へ切り替わった直後に
    // 対象セクションの DOM がレイアウトされるのを待つため。
    // unmount された場合や anchor が変わった場合は cancel して、後続の
    // `scrollIntoView` と `onScrollAnchorConsumed`（state setter）が走らないようにする。
    const id = requestAnimationFrame(() => {
      document
        .getElementById(scrollAnchor)
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
      onScrollAnchorConsumed();
    });
    return () => cancelAnimationFrame(id);
  }, [scrollAnchor, onScrollAnchorConsumed]);

  const heading =
    selectedDetail?.type === "stage"
      ? (scorecards.find((s) => s.stage === selectedDetail.stage)?.label ??
        "詳細")
      : "ステージ詳細";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background",
        "overflow-hidden transition-[width] duration-200 ease-linear",
        pane4Open ? "w-[400px]" : "w-12",
      )}
    >
      {pane4Open ? (
        <>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
            <h2 className="flex-1 truncate text-sm font-semibold text-foreground">
              {heading}
            </h2>
            <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
          </header>

          <ScrollArea className="min-h-0 flex-1">
            {selectedDetail?.type === "stage" && (
              <Mode2StageDetail
                key={`${selectedCandidateId}-${selectedDetail.stage}`}
                scorecard={
                  scorecards.find((s) => s.stage === selectedDetail.stage) ??
                  createMinimalScorecard(selectedDetail.stage)
                }
                onUpdateAxis={onUpdateAxis}
                onUpdateScorecardField={onUpdateScorecardField}
              />
            )}
          </ScrollArea>
        </>
      ) : (
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-border">
          <Pane4Toggle open={pane4Open} onToggle={onTogglePane4} />
        </div>
      )}
    </aside>
  );
}
