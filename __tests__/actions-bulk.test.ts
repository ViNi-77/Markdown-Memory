import { beforeEach, describe, expect, it, vi } from "vitest";
import { documents, folders } from "@/lib/db/schema";
import {
  deleteDocuments,
  enableShareForDocuments,
  moveDocuments,
} from "@/lib/actions";

const {
  andMock,
  authMock,
  descMock,
  eqMock,
  ilikeMock,
  inArrayMock,
  orMock,
  selectMock,
  sqlMock,
  transactionMock,
  txDeleteMock,
  txDeleteWhereMock,
  txSetMock,
  txUpdateMock,
  txWhereMock,
} = vi.hoisted(() => ({
  andMock: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  authMock: vi.fn(),
  descMock: vi.fn((column: unknown) => ({ type: "desc", column })),
  eqMock: vi.fn((column: unknown, value: unknown) => ({
    type: "eq",
    column,
    value,
  })),
  ilikeMock: vi.fn((column: unknown, value: unknown) => ({
    type: "ilike",
    column,
    value,
  })),
  inArrayMock: vi.fn((column: unknown, values: unknown[]) => ({
    type: "inArray",
    column,
    values,
  })),
  orMock: vi.fn((...conditions: unknown[]) => ({ type: "or", conditions })),
  selectMock: vi.fn(),
  sqlMock: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  })),
  transactionMock: vi.fn(),
  txDeleteMock: vi.fn(),
  txDeleteWhereMock: vi.fn(),
  txSetMock: vi.fn(),
  txUpdateMock: vi.fn(),
  txWhereMock: vi.fn(),
}));

const selectResults: unknown[][] = [];

function queueSelectResult(result: unknown[]) {
  selectResults.push(result);
}

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    transaction: transactionMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  desc: descMock,
  eq: eqMock,
  ilike: ilikeMock,
  inArray: inArrayMock,
  or: orMock,
  sql: sqlMock,
}));

describe("bulk document actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectResults.length = 0;
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    selectMock.mockImplementation(() => {
      const result = selectResults.shift() ?? [];
      const limit = vi.fn().mockResolvedValue(result);
      const promise = Promise.resolve(result) as Promise<unknown[]> & {
        limit: typeof limit;
      };
      promise.limit = limit;
      const where = vi.fn(() => promise);
      const from = vi.fn(() => ({ where }));
      return { from };
    });
    txWhereMock.mockResolvedValue(undefined);
    txDeleteWhereMock.mockResolvedValue(undefined);
    txSetMock.mockReturnValue({ where: txWhereMock });
    txUpdateMock.mockReturnValue({ set: txSetMock });
    txDeleteMock.mockReturnValue({ where: txDeleteWhereMock });
    transactionMock.mockImplementation(async (callback) =>
      callback({ update: txUpdateMock, delete: txDeleteMock }),
    );
  });

  it("一括移動は移動先フォルダと所有ファイルを確認してtransactionで更新する", async () => {
    queueSelectResult([{ id: "folder-1" }]);
    queueSelectResult([{ id: "doc-a" }, { id: "doc-b" }]);

    await moveDocuments(["doc-a", "doc-b"], "folder-1");

    expect(eqMock).toHaveBeenCalledWith(folders.id, "folder-1");
    expect(eqMock).toHaveBeenCalledWith(folders.userId, "user-1");
    expect(inArrayMock).toHaveBeenCalledWith(documents.id, ["doc-a", "doc-b"]);
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(txSetMock).toHaveBeenCalledWith({
      folderId: "folder-1",
      updatedAt: expect.any(Date),
    });
  });

  it("一括削除は所有していないIDが含まれる場合に更新しない", async () => {
    queueSelectResult([{ id: "doc-a" }]);

    await expect(deleteDocuments(["doc-a", "missing"])).rejects.toThrow(
      "操作できないファイルが含まれています。",
    );

    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("一括共有は公開済みtokenを再利用し、未公開ファイルだけ更新する", async () => {
    queueSelectResult([
      { id: "doc-a", isPublic: true, shareToken: "existing-token" },
      { id: "doc-b", isPublic: false, shareToken: null },
    ]);

    const result = await enableShareForDocuments(["doc-a", "doc-b"]);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "doc-a", shareToken: "existing-token" });
    expect(result[1]?.id).toBe("doc-b");
    expect(result[1]?.shareToken).toEqual(expect.any(String));
    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    expect(txSetMock).toHaveBeenCalledWith({
      isPublic: true,
      shareToken: expect.any(String),
      updatedAt: expect.any(Date),
    });
  });

  it("空配列は一括操作ごとの明示エラーにする", async () => {
    await expect(moveDocuments([], null)).rejects.toThrow(
      "移動するファイルを選択してください。",
    );
    await expect(deleteDocuments([])).rejects.toThrow(
      "削除するファイルを選択してください。",
    );
    await expect(enableShareForDocuments([])).rejects.toThrow(
      "公開リンクを作成するファイルを選択してください。",
    );
  });
});
