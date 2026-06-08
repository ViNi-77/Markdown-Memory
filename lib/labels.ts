/**
 * 雛形の表示文言（labels）。
 *
 * 業種を変える受講生は、このファイルの値を業種に合わせて書き換える。
 * 例: 学校なら EVALUATION_AXIS を「学力 / 思考力 / 表現力 / 主体性」に、
 *     STAGE_LABELS を「見学 / 体験授業 / 面接 / 契約」に変更する。
 *
 * 後フェーズの予定:
 *   - Phase C: 評価観点と選考ステージを Tagged Union 化したデータ駆動に
 *   - 現時点では key → 日本語ラベルの単純なマッピングとして持つ
 */

import { type AxisKey, type StageKey } from "@/lib/schema";

// ===== 評価観点（4 軸固定、ADR-0005 §13 / design.md D57） =====
// この雛形は 実績 / 思考力 / コミュニケーション / カルチャーフィット の 4 軸を採用する

export const EVALUATION_AXIS: Record<AxisKey, string> = {
  achievements: "実績",
  thinkingAbility: "思考力",
  communication: "コミュニケーション",
  cultureFit: "カルチャーフィット",
} as const;

// Pane 2 のグループ見出しに出すステージ表示名（日本語）。
// `Scorecard.label` とは独立に持つ（候補者ごとの個別ラベルではなく、
// 列としてのステージ名なので Record で固定）。
export const STAGE_LABELS: Record<StageKey, string> = {
  screening: "書類選考",
  first: "一次面接",
  second: "二次面接",
  final: "最終面接",
};

// Pane 2 末尾の「アーカイブ済み」グループの見出しラベル。
// archived === true の候補者を束ねる仮想グループで、ステージとは直交した概念。
export const ARCHIVED_GROUP_LABEL = "アーカイブ済み";

// ===== Pane 3 ダッシュボードのセクション見出し（ADR-0014） =====

export const PANE3_SECTION = {
  applicationInfo: "応募情報",
  recruitingConditions: "採用条件",
  screeningFlow: "選考フロー",
  screeningFlowDescription: "進捗と面接担当者のコメント",
} as const;

// ===== Pane 4 セクション id（ADR-0015 §19 でモード 1 廃止、m2 のみ） =====

export const PANE4_SECTION_IDS = {
  m2: {
    info: "pane4-m2-info",
    evaluation: "pane4-m2-evaluation",
    comment: "pane4-m2-comment",
    summary: "pane4-m2-summary",
    attachments: "pane4-m2-attachments",
  },
} as const;
