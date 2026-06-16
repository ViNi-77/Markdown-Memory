import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarkdownWorkspace } from "@/components/markdown/MarkdownWorkspace";

const { getDocumentMock, updateDocumentContentMock } = vi.hoisted(() => ({
  getDocumentMock: vi.fn(),
  updateDocumentContentMock: vi.fn(),
}));

vi.mock("@/lib/actions", () => ({
  getDocument: getDocumentMock,
  updateDocumentContent: updateDocumentContentMock,
}));

const createdAt = new Date("2026-06-16T00:00:00.000Z");
const updatedAt = new Date("2026-06-16T00:05:00.000Z");

describe("MarkdownWorkspace", () => {
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
});
