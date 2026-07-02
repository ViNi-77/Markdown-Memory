import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownWorkspace } from "@/components/markdown/MarkdownWorkspace";

const {
  deleteDocumentsMock,
  enableShareForDocumentsMock,
  getDocumentMock,
  moveDocumentsMock,
  reorderDocumentsMock,
  searchDocumentsMock,
  updateDocumentContentMock,
} = vi.hoisted(() => ({
  deleteDocumentsMock: vi.fn(),
  enableShareForDocumentsMock: vi.fn(),
  getDocumentMock: vi.fn(),
  moveDocumentsMock: vi.fn(),
  reorderDocumentsMock: vi.fn(),
  searchDocumentsMock: vi.fn(),
  updateDocumentContentMock: vi.fn(),
}));

vi.mock("@/lib/actions", () => ({
  deleteDocuments: deleteDocumentsMock,
  enableShareForDocuments: enableShareForDocumentsMock,
  getDocument: getDocumentMock,
  moveDocuments: moveDocumentsMock,
  reorderDocuments: reorderDocumentsMock,
  searchDocuments: searchDocumentsMock,
  updateDocumentContent: updateDocumentContentMock,
}));

const createdAt = new Date("2026-06-16T00:00:00.000Z");
const updatedAt = new Date("2026-06-16T00:05:00.000Z");

describe("MarkdownWorkspace", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
  });

  it("初期一覧に本文がなくても選択時に1件だけ本文を読み込む", async () => {
    getDocumentMock.mockResolvedValue({
      id: "doc-1",
      userId: "user-1",
      folderId: null,
      name: "memo.md",
      content: "# Loaded",
      isPublic: false,
      shareToken: null,
      sortOrder: 0,
      createdAt,
      updatedAt,
    });

    render(
      <MarkdownWorkspace
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-1",
            userId: "user-1",
            folderId: null,
            name: "memo.md",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    expect(getDocumentMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("memo.md"));

    expect(getDocumentMock).toHaveBeenCalledWith("doc-1");
    expect(
      screen.getAllByText("本文を読み込んでいます。").length,
    ).toBeGreaterThan(0);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Loaded" }),
      ).toBeInTheDocument(),
    );
  });

  it("本文検索はサーバー側で実行し、選択時だけ本文を読み込む", async () => {
    searchDocumentsMock.mockResolvedValue([
      {
        id: "doc-2",
        userId: "user-1",
        folderId: null,
        name: "server-match.md",
        isPublic: false,
        shareToken: null,
        sortOrder: 0,
        createdAt,
        updatedAt,
      },
    ]);
    getDocumentMock.mockResolvedValue({
      id: "doc-2",
      userId: "user-1",
      folderId: null,
      name: "server-match.md",
      content: "# Body Match",
      isPublic: false,
      shareToken: null,
      sortOrder: 0,
      createdAt,
      updatedAt,
    });

    render(
      <MarkdownWorkspace
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-1",
            userId: "user-1",
            folderId: null,
            name: "local-only.md",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("ファイル名・内容で検索"), {
      target: { value: "needle" },
    });

    await waitFor(() =>
      expect(searchDocumentsMock).toHaveBeenCalledWith({
        query: "needle",
        folderId: "all",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText("server-match.md")).toBeInTheDocument(),
    );
    expect(screen.queryByText("local-only.md")).not.toBeInTheDocument();
    expect(getDocumentMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("server-match.md"));

    expect(getDocumentMock).toHaveBeenCalledWith("doc-2");
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Body Match" }),
      ).toBeInTheDocument(),
    );
  });

  it("本文検索は選択中フォルダ条件もサーバーへ渡す", async () => {
    searchDocumentsMock.mockResolvedValue([]);

    render(
      <MarkdownWorkspace
        initialFolders={[
          {
            id: "folder-1",
            userId: "user-1",
            name: "Projects",
            createdAt,
          },
        ]}
        initialDocuments={[]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.change(screen.getByLabelText("ファイル名・内容で検索"), {
      target: { value: "needle" },
    });

    await waitFor(() =>
      expect(searchDocumentsMock).toHaveBeenCalledWith({
        query: "needle",
        folderId: "all",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: /Projects0/ }));

    await waitFor(() =>
      expect(searchDocumentsMock).toHaveBeenLastCalledWith({
        query: "needle",
        folderId: "folder-1",
      }),
    );
  });

  it("本文検索に失敗した場合はエラーと空結果を表示する", async () => {
    searchDocumentsMock.mockRejectedValue(new Error("検索に失敗しました。"));

    render(
      <MarkdownWorkspace
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-1",
            userId: "user-1",
            folderId: null,
            name: "local-only.md",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.change(screen.getByLabelText("ファイル名・内容で検索"), {
      target: { value: "needle" },
    });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "検索に失敗しました。",
      ),
    );
    expect(
      screen.getByText("一致するファイルがありません。"),
    ).toBeInTheDocument();
  });

  it("モバイル下部ナビはスムーズスクロール中もタップしたペインを維持する", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    render(
      <MarkdownWorkspace
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-1",
            userId: "user-1",
            folderId: null,
            name: "memo.md",
            content: "# Loaded",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    const workspace = screen.getByTestId("markdown-workspace");
    Object.defineProperty(workspace, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 0,
    });
    Object.defineProperty(workspace, "scrollTo", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(screen.getByTestId("file-list-pane"), "offsetLeft", {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(screen.getByTestId("document-pane"), "offsetLeft", {
      configurable: true,
      value: 375,
    });

    fireEvent.click(screen.getByRole("button", { name: /memo\.md/ }));

    const detailsPane = screen.getByTestId("details-pane");
    Object.defineProperty(detailsPane, "offsetLeft", {
      configurable: true,
      value: 750,
    });

    fireEvent.click(screen.getByRole("button", { name: "詳細ペインを表示" }));
    fireEvent.scroll(workspace);

    expect(
      screen.getByRole("button", { name: "詳細ペインを表示" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("並び順をファイル名A-Zへ切り替えるとPane 2の表示順を変更する", () => {
    render(
      <MarkdownWorkspace
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-b",
            userId: "user-1",
            folderId: null,
            name: "beta.md",
            isPublic: false,
            shareToken: null,
            sortOrder: 1,
            createdAt,
            updatedAt,
          },
          {
            id: "doc-a",
            userId: "user-1",
            folderId: null,
            name: "alpha.md",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt: new Date("2026-06-15T00:05:00.000Z"),
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.change(screen.getByLabelText("並び順"), {
      target: { value: "name-asc" },
    });

    expect(screen.getAllByText(/\.md$/).map((row) => row.textContent)).toEqual([
      "alpha.md",
      "beta.md",
    ]);
    expect(localStorage.getItem("markdown_memory_file_sort_mode")).toBe(
      "name-asc",
    );
  });

  it("手動順ではキーボード操作で並び替え、Server Actionへ保存する", async () => {
    reorderDocumentsMock.mockResolvedValue(undefined);

    render(
      <MarkdownWorkspace
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-a",
            userId: "user-1",
            folderId: null,
            name: "alpha.md",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
          {
            id: "doc-b",
            userId: "user-1",
            folderId: null,
            name: "beta.md",
            isPublic: false,
            shareToken: null,
            sortOrder: 1,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.change(screen.getByLabelText("並び順"), {
      target: { value: "manual" },
    });
    fireEvent.keyDown(
      screen.getByRole("button", { name: "alpha.md の順番を変更" }),
      { key: "ArrowDown" },
    );

    await waitFor(() =>
      expect(reorderDocumentsMock).toHaveBeenCalledWith(["doc-b", "doc-a"]),
    );
    expect(screen.getAllByText(/\.md$/).map((row) => row.textContent)).toEqual([
      "beta.md",
      "alpha.md",
    ]);
  });

  it("検索中は手動順の並び替えハンドルを無効にする", () => {
    render(
      <MarkdownWorkspace
        demoMode
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-a",
            userId: "user-1",
            folderId: null,
            name: "alpha.md",
            content: "# Alpha",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
          {
            id: "doc-b",
            userId: "user-1",
            folderId: null,
            name: "beta.md",
            content: "# Beta",
            isPublic: false,
            shareToken: null,
            sortOrder: 1,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.change(screen.getByLabelText("並び順"), {
      target: { value: "manual" },
    });
    fireEvent.change(screen.getByLabelText("ファイル名・内容で検索"), {
      target: { value: "alpha" },
    });

    expect(screen.queryByRole("button", { name: /順番を変更/ })).toBeNull();
    expect(
      screen.getByText(/検索中は手動並び替えできません。/),
    ).toBeInTheDocument();
  });

  it("選択モード中の行クリックは本文表示ではなく選択切替にする", () => {
    render(
      <MarkdownWorkspace
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-1",
            userId: "user-1",
            folderId: null,
            name: "memo.md",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "選択" }));
    fireEvent.click(screen.getByText("memo.md"));

    expect(getDocumentMock).not.toHaveBeenCalled();
    expect(screen.getByText("1件選択中")).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "memo.md を選択" }),
    ).toBeChecked();
  });

  it("デモの一括削除は選択ファイルを消し、開いていた本文を閉じる", () => {
    render(
      <MarkdownWorkspace
        demoMode
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-1",
            userId: "user-1",
            folderId: null,
            name: "memo.md",
            content: "# Memo",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.click(screen.getByText("memo.md"));
    expect(screen.getByRole("heading", { name: "Memo" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "選択" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "memo.md を選択" }));
    fireEvent.click(screen.getByText("削除"));
    const deleteButtons = screen.getAllByRole("button", { name: "削除" });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]);

    expect(screen.queryByText("memo.md")).not.toBeInTheDocument();
    expect(
      screen.getByText(/アップロード・新規作成してください。/),
    ).toBeInTheDocument();
  });

  it("デモの一括共有はログイン後利用の案内を表示する", () => {
    render(
      <MarkdownWorkspace
        demoMode
        initialFolders={[]}
        initialDocuments={[
          {
            id: "doc-1",
            userId: "user-1",
            folderId: null,
            name: "memo.md",
            content: "# Memo",
            isPublic: false,
            shareToken: null,
            sortOrder: 0,
            createdAt,
            updatedAt,
          },
        ]}
        userSlot={<div data-testid="user-slot" />}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "選択" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "memo.md を選択" }));
    fireEvent.click(screen.getByRole("button", { name: "公開リンク作成" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "デモでは公開リンクを作成できません。",
    );
    expect(enableShareForDocumentsMock).not.toHaveBeenCalled();
  });
});
