import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountMenu } from "@/components/auth/AccountMenu";

describe("AccountMenu", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("Privacy / Terms とブラウザ保存AIキー削除を提供する", async () => {
    window.localStorage.setItem("markdown_memory_ai_key_gemini", "AIza-test");

    render(
      <AccountMenu
        user={{
          name: "Vini",
          email: "vini@example.com",
          image: null,
        }}
        signOutAction={vi.fn()}
        deleteAccountAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "アカウント設定" }));

    expect(
      screen.getByRole("heading", { name: "アカウント設定" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      "/terms",
    );

    fireEvent.click(screen.getByRole("button", { name: "AIキーを削除" }));

    expect(window.localStorage.getItem("markdown_memory_ai_key_gemini")).toBe(
      null,
    );
    expect(
      screen.getByText("このブラウザに保存されたAIキーを削除しました。"),
    ).toBeInTheDocument();
  });

  it("アカウント削除は確認ダイアログを挟む", () => {
    render(
      <AccountMenu
        user={{ name: "Vini", email: "vini@example.com", image: null }}
        signOutAction={vi.fn()}
        deleteAccountAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "アカウント設定" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "アカウントと保存データを削除",
      }),
    );

    expect(
      screen.getByRole("alertdialog", {
        name: "アカウントと保存データを削除しますか？",
      }),
    ).toBeInTheDocument();
  });
});
