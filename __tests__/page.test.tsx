import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const { authMock, getWorkspaceDataMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getWorkspaceDataMock: vi.fn(),
  redirectMock: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/data", () => ({
  getWorkspaceData: getWorkspaceDataMock,
}));

vi.mock("@/components/auth/UserButton", () => ({
  UserButton: () =>
    React.createElement("div", { "data-testid": "user-button" }),
}));

vi.mock("@/components/markdown/MarkdownWorkspace", () => ({
  MarkdownWorkspace: (props: unknown) =>
    React.createElement("div", { "data-testid": "markdown-workspace", props }),
}));

describe("app/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("未ログインなら /login にリダイレクトする", async () => {
    authMock.mockResolvedValue(null);
    const { default: Page } = await import("../app/page");

    await expect(Page()).rejects.toThrow("redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(getWorkspaceDataMock).not.toHaveBeenCalled();
  });

  it("ログイン済みならワークスペース初期データを渡す", async () => {
    const folders = [{ id: "folder-1", name: "Notes" }];
    const documents = [{ id: "doc-1", name: "memo.md", content: "# Memo" }];
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getWorkspaceDataMock.mockResolvedValue({ folders, documents });
    const { default: Page } = await import("../app/page");

    const element = await Page();

    expect(getWorkspaceDataMock).toHaveBeenCalledOnce();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.initialFolders).toBe(folders);
    expect(element.props.initialDocuments).toBe(documents);
  });
});
