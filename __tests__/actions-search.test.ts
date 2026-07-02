import { beforeEach, describe, expect, it, vi } from "vitest";
import { documents } from "@/lib/db/schema";
import { searchDocuments } from "@/lib/actions";

const {
  andMock,
  ascMock,
  authMock,
  descMock,
  eqMock,
  fromMock,
  ilikeMock,
  inArrayMock,
  limitMock,
  orMock,
  orderByMock,
  selectMock,
  sqlMock,
  whereMock,
} = vi.hoisted(() => ({
  andMock: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  ascMock: vi.fn((column: unknown) => ({ type: "asc", column })),
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
  limitMock: vi.fn(),
  orMock: vi.fn((...conditions: unknown[]) => ({ type: "or", conditions })),
  orderByMock: vi.fn(),
  selectMock: vi.fn(),
  sqlMock: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  })),
  whereMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  and: andMock,
  asc: ascMock,
  desc: descMock,
  eq: eqMock,
  ilike: ilikeMock,
  inArray: inArrayMock,
  or: orMock,
  sql: sqlMock,
}));

describe("searchDocuments", () => {
  let selectedColumns: Record<string, unknown> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    selectedColumns = undefined;
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    limitMock.mockResolvedValue([]);
    orderByMock.mockReturnValue({ limit: limitMock });
    whereMock.mockReturnValue({ orderBy: orderByMock });
    fromMock.mockReturnValue({ where: whereMock });
    selectMock.mockImplementation((columns: Record<string, unknown>) => {
      selectedColumns = columns;
      return { from: fromMock };
    });
  });

  it("name/contentをDB検索し、本文なしのメタデータだけ返す", async () => {
    const rows = [
      {
        id: "doc-1",
        userId: "user-1",
        folderId: "folder-1",
        name: "server-match.md",
        isPublic: false,
        shareToken: null,
        sortOrder: 0,
        createdAt: new Date("2026-06-16T00:00:00.000Z"),
        updatedAt: new Date("2026-06-16T00:05:00.000Z"),
      },
    ];
    limitMock.mockResolvedValue(rows);

    const result = await searchDocuments({
      query: "  needle  ",
      folderId: "folder-1",
    });

    expect(result).toBe(rows);
    expect(selectedColumns).not.toHaveProperty("content");
    expect(ilikeMock).toHaveBeenCalledWith(documents.name, "%needle%");
    expect(ilikeMock).toHaveBeenCalledWith(documents.content, "%needle%");
    expect(eqMock).toHaveBeenCalledWith(documents.userId, "user-1");
    expect(eqMock).toHaveBeenCalledWith(documents.folderId, "folder-1");
    expect(orderByMock).toHaveBeenCalledWith(
      { type: "desc", column: documents.updatedAt },
      { type: "desc", column: documents.createdAt },
      { type: "asc", column: documents.name },
    );
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it("指定されたsortModeをlimit前のDB orderByへ反映する", async () => {
    await searchDocuments({
      query: "needle",
      folderId: "all",
      sortMode: "manual",
    });

    expect(orderByMock).toHaveBeenCalledWith(
      { type: "asc", column: documents.sortOrder },
      { type: "desc", column: documents.updatedAt },
      { type: "asc", column: documents.name },
    );
    expect(limitMock).toHaveBeenCalledWith(50);
  });

  it("空の検索語ではDBへ問い合わせない", async () => {
    const result = await searchDocuments({ query: "   ", folderId: "all" });

    expect(result).toEqual([]);
    expect(selectMock).not.toHaveBeenCalled();
  });
});
