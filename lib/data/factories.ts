import { type Profile, type StageKey, type Scorecard } from "@/lib/schema";
import { STAGE_LABELS } from "@/lib/labels";

/**
 * 未作成ステージをクリックした時に Workspace が自動生成するための最小 Scorecard。
 * 全フィールド空（`deriveStageStatus` で pending 派生）。Pane 4 Mode 2 で inline edit すれば
 * 面接官アサインや日程設定ができる。
 */
export function createMinimalScorecard(stage: StageKey): Scorecard {
  return {
    stage,
    label: STAGE_LABELS[stage],
    date: "",
    format: "",
    interviewer: "",
    axisScores: {
      achievements: null,
      thinkingAbility: null,
      communication: null,
      cultureFit: null,
    },
    attachments: [],
  };
}

/**
 * c1 / c3 / c4 / c5 / c6 など「c2 以外の候補者」用の最小 Profile 生成ヘルパー。
 * ADR-0014 で Profile が 12 フィールド最小構成になり、avatar 頭文字は
 * 呼び出し側で `name[0]` 派生に統一されたため、`initial` 引数は削除済み。
 * 氏名以外は空文字に揃え、Pane 3 / Pane 4 では空欄として可視化される。
 *
 * `addCandidate`（Workspace 本体）からも参照されるため export する。
 */
export function createMinimalProfile(name: string): Profile {
  return {
    // プロフィール (3)
    name,
    birthday: "",
    source: "",

    // 連絡先 (3)
    email: "",
    phone: "",
    address: "",

    // 選考状況 (4)
    recruiter: "",
    desiredSalaryMin: "",
    desiredSalaryMax: "",
    availableStartDate: "",

    // 読み物 (2)
    careerText: "",
    motivationFull: "",
  };
}
