import { describe, it, expect } from "vitest";

import { type Candidate, type Scorecard } from "@/lib/schema";
import {
  calculateAverageScore,
  getCandidateAverageScore,
  getCommentedScorecards,
  getLatestDoneScorecard,
  getScorecardsAverageScore,
} from "@/lib/computed/scorecards";

const baseScorecard = (over: Partial<Scorecard>): Scorecard => ({
  stage: "screening",
  label: "書類選考",
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
  ...over,
});

describe("calculateAverageScore", () => {
  it("全フィールドが null なら null", () => {
    expect(
      calculateAverageScore({
        achievements: null,
        thinkingAbility: null,
        communication: null,
        cultureFit: null,
      }),
    ).toBeNull();
  });

  it("一部 null は除外して平均", () => {
    expect(
      calculateAverageScore({
        achievements: 4,
        thinkingAbility: 3,
        communication: null,
        cultureFit: null,
      }),
    ).toBe(3.5);
  });

  it("4 軸全部入っていれば単純平均", () => {
    expect(
      calculateAverageScore({
        achievements: 5,
        thinkingAbility: 4,
        communication: 3,
        cultureFit: 4,
      }),
    ).toBe(4);
  });
});

describe("getLatestDoneScorecard", () => {
  it("done が無ければ undefined", () => {
    const cards = [
      baseScorecard({ stage: "screening", date: "2026-04-01" }),
      baseScorecard({ stage: "first" }),
    ];
    expect(getLatestDoneScorecard(cards)).toBeUndefined();
  });

  it("配列末尾に近い done を返す（選考フローで最も進んだ評価）", () => {
    const cards = [
      baseScorecard({
        stage: "screening",
        date: "2026-04-01",
        decision: "通過",
      }),
      baseScorecard({ stage: "first", date: "2026-04-10", decision: "通過" }),
      baseScorecard({ stage: "second", date: "2026-04-20" }),
    ];
    const latest = getLatestDoneScorecard(cards);
    expect(latest?.stage).toBe("first");
  });
});

describe("getCandidateAverageScore / getScorecardsAverageScore", () => {
  it("done scorecard が無ければ null", () => {
    const candidate: Candidate = {
      id: "c1",
      profile: {
        name: "テスト 太郎",
        birthday: "",
        source: "",
        email: "",
        phone: "",
        address: "",
        recruiter: "",
        desiredSalaryMin: "",
        desiredSalaryMax: "",
        availableStartDate: "",
        careerText: "",
        motivationFull: "",
      },
      scorecards: [],
      stage: "screening",
      archived: false,
    };
    expect(getCandidateAverageScore(candidate)).toBeNull();
    expect(getScorecardsAverageScore([])).toBeNull();
  });

  it("最新 done の axisScores を平均する", () => {
    const cards = [
      baseScorecard({
        stage: "screening",
        decision: "通過",
        axisScores: {
          achievements: 5,
          thinkingAbility: 5,
          communication: 5,
          cultureFit: 5,
        },
      }),
      baseScorecard({
        stage: "first",
        decision: "通過",
        axisScores: {
          achievements: 3,
          thinkingAbility: 3,
          communication: 3,
          cultureFit: 3,
        },
      }),
    ];
    expect(getScorecardsAverageScore(cards)).toBe(3);
  });
});

describe("getCommentedScorecards", () => {
  it("done かつ comment 付きのみ STAGE_ORDER 順に返す", () => {
    const cards = [
      baseScorecard({
        stage: "first",
        decision: "通過",
        comment: "前向き",
      }),
      baseScorecard({
        stage: "screening",
        decision: "通過",
        comment: "書類良好",
      }),
      baseScorecard({
        stage: "second",
        date: "2026-05-01",
        comment: "未確定だが期待",
      }),
    ];
    const result = getCommentedScorecards(cards);
    expect(result.map((c) => c.stage)).toEqual(["screening", "first"]);
  });
});
