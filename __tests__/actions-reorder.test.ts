import { beforeEach, describe, expect, it, vi } from "vitest";
import { documents } from "@/lib/db/schema";
import { reorderDocuments } from "@/lib/actions";

const {
  andMock,
  authMock,
  descMock,
  eqMock,
  fromMock,
  ilikeMock,
  inArrayMock,
  orMock,
  selectMock,
  selectWhereMock,
  setMock,
  sqlMock,
  transactionMock,
  updateMock,
  updateWhereMock,
} = vi.hoisted(() => ({
  andMock: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  authMock: vi.fn(),
  descMock: vi.fn((column: unknown) => ({ type: "desc", column })),
  eqMock: vi.fn((column: unknown, value: unknown) => ({
    type: "eq",
    column,
    value,
  })),
  fromMock: vi.fn(),
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
  selectWhereMock: vi.fn(),
  setMock: vi.fn(),
  sqlMock: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  })),
  transactionMock: vi.fn(),
  updateMock: vi.fn(),
  updateWhereMock: vi.fn(),
}));

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

describe("reorderDocuments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    selectWhereMock.mockResolvedValue([
      { id: "doc-a" },
      { id: "doc-b" },
      { id: "doc-c" },
    ]);
    fromMock.mockReturnValue({ where: selectWhereMock });
    selectMock.mockReturnValue({ from: fromMock });
    updateWhereMock.mockResolvedValue(undefined);
    setMock.mockReturnValue({ where: updateWhereMock });
    updateMock.mockReturnValue({ set: setMock });
    transactionMock.mockImplementation(async (callback) =>
      callback({ update: updateMock }),
    );
  });

  it("空配列はDB更新せず明示エラーにする", async () => {
    await expect(reorderDocuments([])).rejects.toThrow(
      "並び替えるファイルを選択してください。",
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("重複IDはDB更新せず明示エラーにする", async () => {
    await expect(reorderDocuments(["doc-a", "doc-a"])).rejects.toThrow(
      "並び替えるファイルを選択してください。",
    );

    expect(selectMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("所有していないIDが含まれる場合は更新しない", async () => {
    selectWhereMock.mockResolvedValue([{ id: "doc-a" }]);

    await expect(reorderDocuments(["doc-a", "missing"])).rejects.toThrow(
      "操作できないファイルが含まれています。",
    );

    expect(inArrayMock).toHaveBeenCalledWith(documents.id, [
      "doc-a",
      "missing",
    ]);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("ログインユーザー所有ファイルだけをtransaction内で手動順へ更新する", async () => {
    await reorderDocuments(["doc-b", "doc-a", "doc-c"]);

    expect(eqMock).toHaveBeenCalledWith(documents.userId, "user-1");
    expect(inArrayMock).toHaveBeenCalledWith(documents.id, [
      "doc-b",
      "doc-a",
      "doc-c",
    ]);
    expect(transactionMock).toHaveBeenCalledOnce();
    expect(updateMock).toHaveBeenCalledTimes(3);
    expect(setMock).toHaveBeenNthCalledWith(1, { sortOrder: 0 });
    expect(setMock).toHaveBeenNthCalledWith(2, { sortOrder: 1 });
    expect(setMock).toHaveBeenNthCalledWith(3, { sortOrder: 2 });
    expect(updateWhereMock).toHaveBeenCalledTimes(3);
  });
});
