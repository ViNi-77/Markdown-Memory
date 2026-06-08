import { describe, it, expect } from "vitest";

describe("workspace-ui-kit smoke tests", () => {
  it("page module can be imported", async () => {
    const mod = await import("../app/page");
    expect(mod).toBeDefined();
  });
});
