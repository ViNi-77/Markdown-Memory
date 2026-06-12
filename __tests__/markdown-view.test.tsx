import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownView } from "@/components/markdown/MarkdownView";

describe("MarkdownView", () => {
  it("GFM のチェックリストとテーブルをレンダリングする", () => {
    render(
      <MarkdownView
        content={`# Title\n\n- [x] Done\n\n| A | B |\n|---|---|\n| 1 | 2 |`}
      />,
    );

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
