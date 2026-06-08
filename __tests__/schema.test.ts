import { describe, it, expect } from "vitest";

import {
  candidatesSchema,
  departmentsSchema,
  workspaceSchema,
} from "@/lib/schema";

import positionsData from "@/data/positions.json";
import candidatesData from "@/data/candidates.json";
import workspaceData from "@/data/workspace.json";

describe("data/*.json schema validation", () => {
  it("data/positions.json は departmentsSchema を満たす", () => {
    const result = departmentsSchema.safeParse(positionsData);
    expect(result.success).toBe(true);
  });

  it("data/candidates.json は candidatesSchema を満たす", () => {
    const result = candidatesSchema.safeParse(candidatesData);
    expect(result.success).toBe(true);
  });

  it("data/workspace.json は workspaceSchema を満たす", () => {
    const result = workspaceSchema.safeParse(workspaceData);
    expect(result.success).toBe(true);
  });
});

describe("schema rejects invalid data", () => {
  it("departmentsSchema は配列を期待する", () => {
    expect(departmentsSchema.safeParse({}).success).toBe(false);
    expect(departmentsSchema.safeParse(null).success).toBe(false);
  });

  it("candidate は stage が StageKey でないと不可", () => {
    expect(
      candidatesSchema.safeParse([
        {
          id: "x",
          profile: {
            name: "x",
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
          stage: "unknown-stage",
        },
      ]).success,
    ).toBe(false);
  });

  it("workspaceSchema は name と icon を要求する", () => {
    expect(workspaceSchema.safeParse({ name: "" }).success).toBe(false);
    expect(workspaceSchema.safeParse({ icon: "" }).success).toBe(false);
  });
});

describe("candidate.archived の取り扱い", () => {
  const baseCandidate = {
    id: "c-archived-test",
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
    stage: "screening" as const,
  };

  it("archived 未指定なら false がデフォルトで埋まる", () => {
    const result = candidatesSchema.safeParse([baseCandidate]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].archived).toBe(false);
    }
  });

  it("archived: true を許容する", () => {
    const result = candidatesSchema.safeParse([
      { ...baseCandidate, archived: true },
    ]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].archived).toBe(true);
    }
  });

  it("archived が boolean でなければ不可", () => {
    const result = candidatesSchema.safeParse([
      { ...baseCandidate, archived: "yes" },
    ]);
    expect(result.success).toBe(false);
  });
});
