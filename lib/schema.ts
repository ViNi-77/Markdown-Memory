/**
 * 採用管理ドメインの Zod スキーマと派生型。
 * 雛形の SSoT として、UI コンポーネントはここから型をインポートする。
 *
 * 仕様の出典:
 *   - openspec/decision/0005-dashboard-drilldown-and-global-header.md
 *   - openspec/changes/add-4pane-workspace-template/specs/workspace-template/spec.md
 */

import { z } from "zod";

// ===== Pane 1: 部署 → ポジション 階層 =====

/** 部署配下の単一ポジション。Pane 1 の階層 Sidebar に表示する単位。 */
export const positionSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
});
export type Position = z.infer<typeof positionSchema>;

/** 部署と配下のポジション一覧。Pane 1 の階層 Sidebar の最上位単位。 */
export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  positions: z.array(positionSchema),
});
export type Department = z.infer<typeof departmentSchema>;

// ===== 候補者プロフィール =====

/**
 * 候補者プロフィール。Pane 3 ヘッダー帯トグル内 + 採用条件カードで表示・編集される。
 *
 * 構成: 12 フィールド（応募情報 3 / 連絡先 3 / 採用条件 3 / 読み物 2 / 採用担当 1）。
 *
 * ADR-0014「shadcn 標準フォームによる Pane 4 編集 UI」で Lab v3 の最小構成を採用し、
 * 旧 ADR-0010 §10 H の Profile 型を supersede。削除されたフィールド
 * (`initial` / `currentCompany` / `currentRole` / `nextActionDeadline` /
 * `otherCompanies` / `desiredSalary` / `age` / `experienceYears` / `applyPosition` /
 * `careerSummary` / `motivationSummary`) は「最小プロフィール」方針により撤去:
 *
 *   - `name[0]` 派生で avatar の頭文字を生成（`initial` 廃止）
 *   - `desiredSalary` は min/max に分割（`min`〜`max` 万円の構造化編集）
 *   - `age` は `birthday` から `calculateAge` で派生表示
 *   - 現職情報・経験年数は職務経歴 textarea に集約
 *   - サマリ系（`careerSummary` / `motivationSummary`）は full 文字列だけで運用
 */
export const profileSchema = z.object({
  name: z.string(),
  birthday: z.string(),
  source: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  recruiter: z.string(),
  desiredSalaryMin: z.string(),
  desiredSalaryMax: z.string(),
  availableStartDate: z.string(),
  careerText: z.string(),
  motivationFull: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

// ===== 評価観点（4 軸固定、ADR-0005 §13 / design.md D57） =====
// この雛形は 実績 / 思考力 / コミュニケーション / カルチャーフィット の 4 軸を採用する

/** 評価観点キー。Scorecard.axisScores のキーと一致する。 */
export const axisKeySchema = z.enum([
  "achievements",
  "thinkingAbility",
  "communication",
  "cultureFit",
]);
export type AxisKey = z.infer<typeof axisKeySchema>;

/** 4 観点別スコア。未評価は null。平均スコアは null 除外で派生計算する。 */
export const axisScoresSchema = z.object({
  achievements: z.number().nullable(),
  thinkingAbility: z.number().nullable(),
  communication: z.number().nullable(),
  cultureFit: z.number().nullable(),
});
export type AxisScores = z.infer<typeof axisScoresSchema>;

/** 評価観点の表示順。Pane 3 評価カードと Pane 4 モード 2 で共通に使う。 */
export const AXIS_ORDER = axisKeySchema.options;

// ===== 選考フロー =====

/** 選考ステージのキー。`STAGE_ORDER` と一致する 4 段階。 */
export const stageKeySchema = z.enum(["screening", "first", "second", "final"]);
export type StageKey = z.infer<typeof stageKeySchema>;

/** ステージの実施ステータス。done = 実施済 / planned = 予定済 / pending = 未定。 */
export const stageStatusSchema = z.enum(["done", "planned", "pending"]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

/**
 * 添付ファイル（Attachment）。Pane 4 モード 2 の「提出書類 / 文字起こし」両セクションで
 * 共通のファイル一覧として表示される（ADR-0010 §13 D75、ADR-0008 / ADR-0009 と整合）。
 *
 * `kind: "txt" | "pdf"` の discriminated union で、`txt` は `previewText` 必須、
 * `pdf` は持たない（雛形では PDF の中身プレビューはスコープ外。行は `disabled` で
 * 「プレビュー不可」バッジ表示、DL のみ可能）。`id` は React の `key` と一意性確保
 * のために必須。
 */
const txtAttachmentSchema = z.object({
  id: z.string(),
  kind: z.literal("txt"),
  name: z.string(),
  size: z.string(),
  previewText: z.string(),
});
const pdfAttachmentSchema = z.object({
  id: z.string(),
  kind: z.literal("pdf"),
  name: z.string(),
  size: z.string(),
});
export const attachmentSchema = z.discriminatedUnion("kind", [
  txtAttachmentSchema,
  pdfAttachmentSchema,
]);
export type Attachment = z.infer<typeof attachmentSchema>;

/**
 * 選考ステージごとのスコアカード（メタ情報 + 評価 + コメント + 要約 + 添付）。
 *
 * ADR-0010 §13 D75 / ADR-0008 で「提出書類 / 文字起こし」を `attachments` 統一型に
 * 集約した。旧 `transcript?: string[]` / `documents?: Array<{ name; size }>` は
 * 削除済（互換層なし、KISS）。書類選考も面接も同じ `Attachment[]` を持ち、
 * UI 側（`AttachmentList`）で同型のファイル一覧として描画される。
 */
export const scorecardSchema = z.object({
  stage: stageKeySchema,
  label: z.string(),
  date: z.string(),
  format: z.string(),
  interviewer: z.string(),
  decision: z.string().optional(),
  comment: z.string().optional(),
  summary: z.string().optional(),
  axisScores: axisScoresSchema,
  attachments: z.array(attachmentSchema),
});
export type Scorecard = z.infer<typeof scorecardSchema>;

/**
 * Pane 2 で表示するステージの並び順（左から右へ進行する選考フローと一致）。
 * `STAGE_ORDER` は派生計算（candidateGroups）と「+ 追加」UI の両方から参照する。
 */
export const STAGE_ORDER = stageKeySchema.options;

// ===== 候補者 =====

/**
 * 候補者の最上位データ。Pane 2 の所属グループは `stage` で決まる。
 * 各 scorecard の派生 status (`deriveStageStatus`) とは独立に持ち、
 * 「現在どのステージに居るか」を表す。
 */
export const candidateSchema = z.object({
  id: z.string(),
  profile: profileSchema,
  scorecards: z.array(scorecardSchema),
  stage: stageKeySchema,
  // 論理削除フラグ。`stage` とは直交する。アーカイブされた候補者は通常のステージ
  // グループから外れ、Pane 2 末尾の「アーカイブ済み」グループに表示される。
  // 復元時は `stage` をそのまま使って元のステージへ戻る。JSON シードでは省略可
  // （`.default(false)` で読み込み時に補完）。
  archived: z.boolean().default(false),
});
export type Candidate = z.infer<typeof candidateSchema>;

// ===== JSON 全体用スキーマ =====

export const departmentsSchema = z.array(departmentSchema);
export const candidatesSchema = z.array(candidateSchema);
export const workspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
});

// ===== Pane 4 の表示状態（SelectedDetail） =====

/**
 * Pane 4 に「何を開いているか」を表す型（ADR-0015 §9 大決定 G）。
 *
 * - `{ type: "stage"; stage }`: 選考ステージ詳細を表示中
 * - `null`: ステージ未選択（Pane 4 は畳み状態）
 *
 * 旧 `{ type: "profile" }` はモード 1 廃止（ADR-0015 §4 大決定 B）に伴い削除。
 */
export type SelectedDetail = { type: "stage"; stage: StageKey } | null;

// ===== Pane 2 の派生計算用 UI 表示型 =====
// Workspace の派生計算 (candidateGroups) と CandidateListPane の props 型として共有する。
// candidates 配列から生成される表示単位。
//
// `averageScore` は `lib/computed/scorecards.ts` の `getCandidateAverageScore` で
// 派生計算した値を Workspace 側で詰めて渡す。Pane 2 候補者行の右端に
// `★ 4.5` または `—`（未評価）として表示される。Pane 3 評価カードの「平均スコア」
// と同じ意味（最新 done scorecard の axisScores 平均、ADR-0013）。

export type CandidateRow = {
  id: string;
  name: string;
  averageScore: number | null;
};

// Pane 2 のグループ表示単位（ステージ or アーカイブ済み）。
// 候補者データは `INITIAL_CANDIDATES` を SSoT とし、`candidateGroups` で
// 派生計算して CandidateListPane に props で渡す（Workspace 内で計算）。
//
// `kind: "stage"` は通常の選考ステージグループ。`stage: StageKey` は
// 「+ ボタン」から `addCandidate(stage)` を呼ぶときの引数に使う。
// `kind: "archived"` は archived === true の候補者を集めた末尾の仮想グループで、
// 「+ 追加」操作は持たず、復元のみ可能。並び順は `kind: "stage"` を STAGE_ORDER で
// 並べた後、最後に `kind: "archived"` を 1 つだけ置く（要素があるときのみ表示）。
export type Group =
  | { kind: "stage"; stage: StageKey; label: string; items: CandidateRow[] }
  | { kind: "archived"; label: string; items: CandidateRow[] };
