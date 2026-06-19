import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiAssistPanel } from "@/components/markdown/AiAssistPanel";
import {
  AI_PROVIDER_KEY_STORAGE,
  AI_PROVIDER_STORAGE,
  LEGACY_GEMINI_API_KEY_STORAGE,
} from "@/lib/ai";
import type { Document } from "@/lib/db/schema";

vi.mock("@/lib/actions", () => ({
  updateDocumentContent: vi.fn(),
}));

const document: Document = {
  id: "doc-1",
  userId: "user-1",
  folderId: null,
  name: "memo.md",
  content: "# Memo",
  isPublic: false,
  shareToken: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function renderPanel() {
  return render(
    <AiAssistPanel
      document={document}
      onContentChange={vi.fn()}
      onError={vi.fn()}
    />,
  );
}

describe("AiAssistPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("初期表示はClaudeモードにする", () => {
    renderPanel();

    expect(
      screen.getByRole("button", { name: /アプリ内AI · Claude/ }),
    ).toBeInTheDocument();
  });

  it("最後に選んだproviderを復元する", async () => {
    localStorage.setItem(AI_PROVIDER_STORAGE, "gpt");

    renderPanel();

    expect(
      await screen.findByRole("button", { name: /アプリ内AI · GPT/ }),
    ).toBeInTheDocument();
  });

  it("旧Gemini APIキーを新しいGemini keyへ移行する", async () => {
    localStorage.setItem(LEGACY_GEMINI_API_KEY_STORAGE, "AIza-legacy");

    renderPanel();

    await waitFor(() =>
      expect(localStorage.getItem(AI_PROVIDER_KEY_STORAGE.gemini)).toBe(
        "AIza-legacy",
      ),
    );
    expect(localStorage.getItem(LEGACY_GEMINI_API_KEY_STORAGE)).toBeNull();
  });

  it("provider別APIキーを保存できる", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /アプリ内AI/ }));
    fireEvent.click(screen.getByTitle("APIキー設定"));
    expect(screen.getByText("Claudeモード")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("sk-ant-..."), {
      target: { value: " sk-ant-test " },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    expect(localStorage.getItem(AI_PROVIDER_KEY_STORAGE.claude)).toBe(
      "sk-ant-test",
    );
  });
});
