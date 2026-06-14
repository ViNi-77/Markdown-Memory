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

  it("ネストしたタスクリストの子要素を保持する", () => {
    const { container } = render(
      <MarkdownView content={`- [ ] 親タスク\n  - 子タスク`} />,
    );

    const taskItem = container.querySelector(".task-list-item");
    expect(taskItem).toHaveTextContent("親タスク");
    expect(taskItem?.querySelector("ul")).toHaveTextContent("子タスク");
  });

  it("引用符を含む太字・取り消し線・脚注をレンダリングする", () => {
    const { container } = render(
      <MarkdownView
        content={`**"重要な一文"** と ~~古い表現~~ です。\n\n脚注つきの文です[^1]\n\n[^1]: 補足説明です。`}
      />,
    );

    expect(container.querySelector("strong")?.textContent).toBe('"重要な一文"');
    expect(container.querySelector("del")?.textContent).toBe("古い表現");
    expect(
      container.querySelector("section[data-footnotes]"),
    ).toHaveTextContent("補足説明です。");
    expect(screen.getByRole("heading", { name: "脚注" })).toBeInTheDocument();
  });

  it("GitHub 風のアラート記法を読みやすいブロックに変換する", () => {
    const { container } = render(
      <MarkdownView content={`> [!WARNING]\n> 公開前に共有設定を確認する。`} />,
    );

    expect(container.querySelector(".markdown-alert-warning")).toHaveAttribute(
      "role",
      "note",
    );
    expect(screen.getByText("Warning")).toBeInTheDocument();
    expect(
      screen.getByText("公開前に共有設定を確認する。"),
    ).toBeInTheDocument();
  });

  it("外部リンクは新しいタブで開き、raw HTML は実行可能な要素にしない", () => {
    const { container } = render(
      <MarkdownView
        content={`https://example.com\n\n<script>alert("xss")</script>`}
      />,
    );

    expect(
      screen.getByRole("link", { name: "https://example.com" }),
    ).toHaveAttribute("target", "_blank");
    expect(container.querySelector("script")).not.toBeInTheDocument();
    expect(screen.getByText(/alert\("xss"\)/)).toBeInTheDocument();
  });
});
