import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiAssistPanel } from "@/components/markdown/AiAssistPanel";
import * as actions from "@/lib/actions";
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

function renderPanel(
  doc: Document = document,
  props: Partial<React.ComponentProps<typeof AiAssistPanel>> = {},
) {
  return render(
    <AiAssistPanel
      document={doc}
      onContentChange={vi.fn()}
      onError={vi.fn()}
      {...props}
    />,
  );
}

function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: /アプリ内AI/ }));
}

function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "APIキー設定" }));
}

describe("AiAssistPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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

  it("provider別APIキーを保存・削除できる", () => {
    renderPanel();

    openPanel();
    openSettings();
    expect(screen.getAllByText("Claudeモード").length).toBeGreaterThan(0);
    expect(screen.getByText("キー未保存")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("sk-ant-..."), {
      target: { value: " sk-ant-test " },
    });
    fireEvent.click(screen.getByRole("button", { name: "キーを保存" }));

    expect(localStorage.getItem(AI_PROVIDER_KEY_STORAGE.claude)).toBe(
      "sk-ant-test",
    );
    expect(screen.getAllByText("キー保存済み")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "キーを削除" }));

    expect(localStorage.getItem(AI_PROVIDER_KEY_STORAGE.claude)).toBeNull();
    expect(screen.getByText("キー未保存")).toBeInTheDocument();
  });

  it("本文が空のときはAIを実行せず案内する", () => {
    const onError = vi.fn();
    renderPanel({ ...document, content: "" }, { onError });

    openPanel();

    expect(
      screen.getByText("本文が空です。編集してからAIを実行できます。"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /要約/ }));

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("APIエラー表示ではAPIキーらしい文字列を伏せる", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "provider rejected sk-abcdefghijklmnopqrstuvwxyz012345",
      }),
    } as Response);

    renderPanel();
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: /要約/ }));

    expect(await screen.findByText(/REDACTED_API_KEY/)).toBeInTheDocument();
    expect(
      screen.queryByText(/sk-abcdefghijklmnopqrstuvwxyz012345/),
    ).not.toBeInTheDocument();
  });

  it("AI提案の本文置き換えは確認してから保存する", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ result: "## 提案\n\n整理済みです。" }),
    } as Response);
    vi.mocked(actions.updateDocumentContent).mockResolvedValue(undefined);

    renderPanel();
    openPanel();
    fireEvent.click(screen.getByRole("button", { name: /要約/ }));

    expect(await screen.findByText("整理済みです。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "本文を置き換え" }));

    expect(screen.getByText("本文を置き換えますか")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "置き換える" }));

    await waitFor(() =>
      expect(actions.updateDocumentContent).toHaveBeenCalledWith(
        "doc-1",
        "## 提案\n\n整理済みです。",
      ),
    );
  });
});
