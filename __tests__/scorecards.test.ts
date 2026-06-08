import { describe, it, expect } from "vitest";
import { deriveStageStatus } from "@/lib/computed/scorecards";

describe("deriveStageStatus", () => {
  it("date も decision も空なら pending", () => {
    expect(deriveStageStatus("", undefined)).toBe("pending");
    expect(deriveStageStatus("")).toBe("pending");
  });

  it("date があり decision が空なら planned", () => {
    expect(deriveStageStatus("2026-05-01", undefined)).toBe("planned");
    expect(deriveStageStatus("2026-05-01", "")).toBe("planned");
  });

  it("decision があれば done（date の有無は問わない）", () => {
    expect(deriveStageStatus("2026-05-01", "通過")).toBe("done");
    expect(deriveStageStatus("", "不合格")).toBe("done");
  });

  it("空白のみの decision は空扱いで done にならない", () => {
    expect(deriveStageStatus("2026-05-01", "  ")).toBe("planned");
    expect(deriveStageStatus("", "  ")).toBe("pending");
  });

  it("空白のみの date は空扱いで planned にならない", () => {
    expect(deriveStageStatus("  ", undefined)).toBe("pending");
    expect(deriveStageStatus("  ", "通過")).toBe("done");
  });
});
