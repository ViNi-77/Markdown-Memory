/**
 * Scorecard / Candidate の派生計算（評価系）SSoT。
 *
 * Pane 2 候補者行の平均スコアバッジ (★ 4.5 / —) と、
 * Pane 3 評価カードの「平均スコア」行は、同じ意味の値を表示する。
 * 同じ計算を 2 箇所で持つと「ある日 Pane 2 だけ違う値が出る」事故が発生するため、
 * 計算ロジックは本ファイルの 3 関数に集約する MUST。
 *
 * 関連:
 *   - openspec/decision/0013-list-pane-lightweight-header-and-row-evaluation.md
 *   - openspec/decision/0010-pane-responsibility-and-candidate-detail-mode.md
 *     §11 候補者単位 vs ステージ単位の責務分離（評価はステージ単位だが、
 *     候補者代表値として「最新 done scorecard の平均」を使う）
 */

import {
  type Candidate,
  type AxisScores,
  type Scorecard,
  type StageStatus,
  AXIS_ORDER,
  STAGE_ORDER,
} from "@/lib/schema";

/**
 * 「最後に done 状態となった scorecard」を返す。done が存在しない場合は undefined。
 *
 * 配列の末尾に近いものを優先することで、選考フロー (書類 → 一次 → 二次 → 最終) で
 * 「最も進んだステージの評価」を代表値として取り出せる。シード `INITIAL_SCORECARDS`
 * は STAGE_ORDER と同じ順で並ぶ前提（design.md / spec.md）。
 */
export function getLatestDoneScorecard(
  scorecards: Scorecard[],
): Scorecard | undefined {
  return [...scorecards]
    .reverse()
    .find((s) => deriveStageStatus(s.date, s.decision) === "done");
}

/**
 * 1 つの scorecard の axisScores（4 観点）の平均を返す。null は除外。
 *
 * 全 axis が null（未入力）の場合は null を返す（呼び出し側で「—」表示）。
 * 丸めは行わず、表示側で `toFixed(1)` 等を適用する。
 */
export function calculateAverageScore(axisScores: AxisScores): number | null {
  const values = AXIS_ORDER.map((k) => axisScores[k]).filter(
    (v): v is number => v !== null,
  );
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 候補者の「代表平均スコア」を返す。
 * = 最新 done scorecard の axisScores の平均。
 *
 * Pane 2 候補者行のサブテキスト (★ 4.5 / —) と、Pane 3 評価カードの「平均スコア」行で
 * 同じ意味の値を出すために使う。done scorecard が無い・全 axis が null・候補者が
 * scorecards を持たないいずれの場合も null（未評価扱い）。
 */
export function getCandidateAverageScore(candidate: Candidate): number | null {
  const latest = getLatestDoneScorecard(candidate.scorecards);
  if (!latest) return null;
  return calculateAverageScore(latest.axisScores);
}

/**
 * 完了済み（`status === "done"`）かつコメントあり（`comment` が truthy）の
 * scorecard を STAGE_ORDER 順で返す。Pane 3「担当者コメント」Card の行リストに使う。
 *
 * 空配列が返った場合は「コメントはまだ記入されていません」の placeholder を表示する。
 */
export function getCommentedScorecards(scorecards: Scorecard[]): Scorecard[] {
  const stageIndex = Object.fromEntries(
    STAGE_ORDER.map((s, i) => [s, i]),
  ) as Record<string, number>;
  return scorecards
    .filter(
      (s) => deriveStageStatus(s.date, s.decision) === "done" && s.comment,
    )
    .sort((a, b) => (stageIndex[a.stage] ?? 0) - (stageIndex[b.stage] ?? 0));
}

/**
 * scorecards 配列から候補者の代表平均スコアを計算する。
 * `getCandidateAverageScore` の Candidate 型を要求しない版。
 * Pane 3 ヘッダー帯の `<ScoreLabel>` で使う。
 */
export function getScorecardsAverageScore(
  scorecards: Scorecard[],
): number | null {
  const latest = getLatestDoneScorecard(scorecards);
  if (!latest) return null;
  return calculateAverageScore(latest.axisScores);
}

/**
 * Scorecard の date / decision の有無から状態を派生計算する。
 *
 * ADR-0015 §17.1 追加決定 I で `Scorecard.status` フィールドを廃止したため、
 * 表示時に都度この関数で導出する MUST。
 *
 *   - decision あり (truthy)               → done   (実施済 + 結果あり)
 *   - decision なし、date あり (truthy)    → planned (予定済)
 *   - 両方なし                              → pending (未着手)
 *
 * Pane 3 選考フローカードの StageIcon、コメント抽出のフィルタ、ヘッダー帯の
 * ★ スコア表示など、status を必要とするすべての表示で使う。
 */
export function deriveStageStatus(
  date: string,
  decision?: string,
): StageStatus {
  if (decision && decision.trim() !== "") return "done";
  if (date && date.trim() !== "") return "planned";
  return "pending";
}
