import { beforeEach, describe, expect, it, vi } from "vitest";
import { users } from "@/lib/db/schema";
import { deleteCurrentUserAccount } from "@/lib/actions";

const { authMock, deleteMock, eqMock, returningMock, whereMock } = vi.hoisted(
  () => ({
    authMock: vi.fn(),
    deleteMock: vi.fn(),
    eqMock: vi.fn((column: unknown, value: unknown) => ({
      type: "eq",
      column,
      value,
    })),
    returningMock: vi.fn(),
    whereMock: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    delete: deleteMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  desc: vi.fn((column: unknown) => ({ type: "desc", column })),
  eq: eqMock,
  ilike: vi.fn((column: unknown, value: unknown) => ({
    type: "ilike",
    column,
    value,
  })),
  or: vi.fn((...conditions: unknown[]) => ({ type: "or", conditions })),
}));

describe("deleteCurrentUserAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    returningMock.mockResolvedValue([{ id: "user-1" }]);
    whereMock.mockReturnValue({ returning: returningMock });
    deleteMock.mockReturnValue({ where: whereMock });
  });

  it("未ログインでは削除しない", async () => {
    authMock.mockResolvedValue(null);

    await expect(deleteCurrentUserAccount()).rejects.toThrow(
      "認証が必要です。",
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("ログイン中ユーザーのuser行を削除する", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });

    await deleteCurrentUserAccount();

    expect(deleteMock).toHaveBeenCalledWith(users);
    expect(eqMock).toHaveBeenCalledWith(users.id, "user-1");
    expect(returningMock).toHaveBeenCalledWith({ id: users.id });
  });

  it("削除対象がない場合は明示エラーにする", async () => {
    authMock.mockResolvedValue({ user: { id: "missing-user" } });
    returningMock.mockResolvedValue([]);

    await expect(deleteCurrentUserAccount()).rejects.toThrow(
      "アカウントが見つかりません。",
    );
  });
});
