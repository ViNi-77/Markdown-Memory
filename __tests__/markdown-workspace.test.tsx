import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownWorkspace } from "@/components/markdown/MarkdownWorkspace";

const { getDocumentMock, searchDocumentsMock, updateDocumentContentMock } =
  vi.hoisted(() => ({
    getDocumentMock: vi.fn(),
    searchDocumentsMock: vi.fn(),
    updateDocumentContentMock: vi.fn(),
  }));

vi.mock("@/lib/actions", () => ({
  getDocument: getDocumentMock,
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
});
