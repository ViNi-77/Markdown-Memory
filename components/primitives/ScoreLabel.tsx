/**
 * ScoreLabel — 候補者の代表平均スコアを「★ 4.3」形式で表示する読み取り専用ラベル。
 *
 * Pane 3 ヘッダー帯（閉時）で名前の隣にサブテキストとして配置し、
 * 採用担当者が「この候補者は採る価値があるか」を 5 秒で判断する材料となる。
 *
 * 計算は `getCandidateAverageScore()` の派生値（最新 done scorecard の axisScores 平均）。
 * null（未評価）のときは `★ —` を表示する。
 *
 * クリック動作は持たない（ADR-0015 §19 大決定 L: スコアは読み取り専用ラベル）。
 * 4 軸の内訳が見たければ、選考フローカードから Pane 4 モード 2 へジャンプする。
 */

import { Star } from "lucide-react";

export type ScoreLabelProps = {
  /** 平均スコア（null = 未評価） */
  value: number | null;
};

export function ScoreLabel({ value }: ScoreLabelProps) {
  const displayValue = value !== null ? value.toFixed(1) : "—";
  return (
    <span
      className="inline-flex items-center gap-1 text-sm text-muted-foreground tabular-nums"
      aria-label={
        value !== null ? `評価平均 ${displayValue} 点` : "評価平均 未評価"
      }
    >
      <Star className="size-3 fill-primary text-primary" aria-hidden="true" />
      {displayValue}
    </span>
  );
}
