"use server";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { folders, documents, users } from "@/lib/db/schema";
import type { Folder, Document } from "@/lib/db/schema";
import type { WorkspaceDocument } from "@/lib/data";

type ShareDocumentResult = { id: string; shareToken: string };

/** ログイン中ユーザーIDを取得。未ログインなら例外。全アクションの入口で所有者を確定する。 */
async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("認証が必要です。サインインしてください。");
  return userId;
}

async function requireOwnedFolder(
  folderId: string,
  userId: string,
): Promise<void> {
  const [folder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(and(eq(folders.id, folderId), eq(folders.userId, userId)))
    .limit(1);

  if (!folder) throw new Error("移動先フォルダが見つかりません。");
}

function assertMutation(
  row: { id: string } | undefined,
  message: string,
): void {
  if (!row) throw new Error(message);
}

function uniqueIds(ids: string[]): string[] {
  const trimmed = ids.map((id) => id.trim()).filter(Boolean);
  return Array.from(new Set(trimmed));
}

async function requireOwnedDocuments(
  ids: string[],
  userId: string,
): Promise<void> {
  if (ids.length === 0) throw new Error("ファイルを選択してください。");
  const rows = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.userId, userId), inArray(documents.id, ids)));

  if (rows.length !== ids.length) {
    throw new Error("操作できないファイルが含まれています。");
  }
}

async function nextManualSortOrder(userId: string): Promise<number> {
  const [row] = await db
    .select({
      value: sql<number>`coalesce(min(${documents.sortOrder}) - 1, 0)`,
    })
    .from(documents)
    .where(eq(documents.userId, userId));

  return row?.value ?? 0;
}

// ===== フォルダ =====

export async function createFolder(name: string): Promise<Folder> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("フォルダ名を入力してください。");
  const [row] = await db
    .insert(folders)
    .values({ userId, name: trimmed })
    .returning();
  return row;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("フォルダ名を入力してください。");
  const [row] = await db
    .update(folders)
    .set({ name: trimmed })
    .where(and(eq(folders.id, id), eq(folders.userId, userId)))
    .returning({ id: folders.id });
  assertMutation(row, "フォルダが見つかりません。");
}

export async function deleteFolder(id: string): Promise<void> {
  const userId = await requireUserId();
  // documents.folderId は onDelete: "set null" なので、中のファイルはルートへ戻る（削除しない）。
  const [row] = await db
    .delete(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, userId)))
    .returning({ id: folders.id });
  assertMutation(row, "フォルダが見つかりません。");
}

// ===== ドキュメント =====

export async function createDocument(input: {
  name: string;
  content?: string;
  folderId?: string | null;
}): Promise<Document> {
  const userId = await requireUserId();
  const name = input.name.trim() || "無題.md";
  if (input.folderId) await requireOwnedFolder(input.folderId, userId);
  const sortOrder = await nextManualSortOrder(userId);
  const [row] = await db
    .insert(documents)
    .values({
      userId,
      name,
      content: input.content ?? "",
      folderId: input.folderId ?? null,
      sortOrder,
    })
    .returning();
  return row;
}

export async function getDocument(id: string): Promise<Document> {
  const userId = await requireUserId();
  const [row] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);

  if (!row) throw new Error("ファイルが見つかりません。");
  return row;
}

export async function searchDocuments(input: {
  query: string;
  folderId?: string | "all" | null;
}): Promise<WorkspaceDocument[]> {
  const userId = await requireUserId();
  const query = input.query.trim();
  if (!query) return [];

  const pattern = `%${query}%`;
  const searchCondition = or(
    ilike(documents.name, pattern),
    ilike(documents.content, pattern),
  );
  const folderCondition =
    input.folderId && input.folderId !== "all"
      ? eq(documents.folderId, input.folderId)
      : undefined;
  const whereCondition = folderCondition
    ? and(eq(documents.userId, userId), folderCondition, searchCondition)
    : and(eq(documents.userId, userId), searchCondition);

  return db
    .select({
      id: documents.id,
      userId: documents.userId,
      folderId: documents.folderId,
      name: documents.name,
      isPublic: documents.isPublic,
      shareToken: documents.shareToken,
      sortOrder: documents.sortOrder,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
    })
    .from(documents)
    .where(whereCondition)
    .orderBy(desc(documents.updatedAt))
    .limit(50);
}

export async function updateDocumentContent(
  id: string,
  content: string,
): Promise<void> {
  const userId = await requireUserId();
  const [row] = await db
    .update(documents)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning({ id: documents.id });
  assertMutation(row, "ファイルが見つかりません。");
}

export async function renameDocument(id: string, name: string): Promise<void> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("ファイル名を入力してください。");
  const [row] = await db
    .update(documents)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning({ id: documents.id });
  assertMutation(row, "ファイルが見つかりません。");
}

export async function moveDocument(
  id: string,
  folderId: string | null,
): Promise<void> {
  const userId = await requireUserId();
  if (folderId) await requireOwnedFolder(folderId, userId);
  const [row] = await db
    .update(documents)
    .set({ folderId, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning({ id: documents.id });
  assertMutation(row, "ファイルが見つかりません。");
}

export async function moveDocuments(
  ids: string[],
  folderId: string | null,
): Promise<void> {
  const userId = await requireUserId();
  const documentIds = uniqueIds(ids);
  if (documentIds.length !== ids.length || documentIds.length === 0) {
    throw new Error("移動するファイルを選択してください。");
  }
  if (folderId) await requireOwnedFolder(folderId, userId);
  await requireOwnedDocuments(documentIds, userId);

  await db.transaction(async (tx) => {
    await tx
      .update(documents)
      .set({ folderId, updatedAt: new Date() })
      .where(
        and(eq(documents.userId, userId), inArray(documents.id, documentIds)),
      );
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const userId = await requireUserId();
  const [row] = await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning({ id: documents.id });
  assertMutation(row, "ファイルが見つかりません。");
}

export async function deleteDocuments(ids: string[]): Promise<void> {
  const userId = await requireUserId();
  const documentIds = uniqueIds(ids);
  if (documentIds.length !== ids.length || documentIds.length === 0) {
    throw new Error("削除するファイルを選択してください。");
  }
  await requireOwnedDocuments(documentIds, userId);

  await db.transaction(async (tx) => {
    await tx
      .delete(documents)
      .where(
        and(eq(documents.userId, userId), inArray(documents.id, documentIds)),
      );
  });
}

export async function reorderDocuments(orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  const ids = uniqueIds(orderedIds);
  if (ids.length !== orderedIds.length || ids.length === 0) {
    throw new Error("並び替えるファイルを選択してください。");
  }
  await requireOwnedDocuments(ids, userId);

  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(documents)
        .set({ sortOrder: index })
        .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    }
  });
}

// ===== 共有 =====

/** 公開リンクを発行（公開済みなら既存トークンを返す）して on にする。 */
export async function enableShare(id: string): Promise<string> {
  const userId = await requireUserId();
  const [current] = await db
    .select({ shareToken: documents.shareToken, isPublic: documents.isPublic })
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .limit(1);

  if (!current) throw new Error("ファイルが見つかりません。");
  if (current.isPublic && current.shareToken) return current.shareToken;

  const token = randomBytes(16).toString("base64url");
  const [row] = await db
    .update(documents)
    .set({ isPublic: true, shareToken: token, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning({ shareToken: documents.shareToken });
  if (!row?.shareToken) throw new Error("共有の有効化に失敗しました。");
  return row.shareToken;
}

/** 複数ファイルの公開リンクを発行する。公開済みなら既存トークンを再利用する。 */
export async function enableShareForDocuments(
  ids: string[],
): Promise<ShareDocumentResult[]> {
  const userId = await requireUserId();
  const documentIds = uniqueIds(ids);
  if (documentIds.length !== ids.length || documentIds.length === 0) {
    throw new Error("公開リンクを作成するファイルを選択してください。");
  }

  const rows = await db
    .select({
      id: documents.id,
      isPublic: documents.isPublic,
      shareToken: documents.shareToken,
    })
    .from(documents)
    .where(
      and(eq(documents.userId, userId), inArray(documents.id, documentIds)),
    );

  if (rows.length !== documentIds.length) {
    throw new Error("操作できないファイルが含まれています。");
  }

  const tokenById = new Map<string, string>();

  await db.transaction(async (tx) => {
    for (const row of rows) {
      if (row.isPublic && row.shareToken) {
        tokenById.set(row.id, row.shareToken);
        continue;
      }

      const token = randomBytes(16).toString("base64url");
      await tx
        .update(documents)
        .set({ isPublic: true, shareToken: token, updatedAt: new Date() })
        .where(and(eq(documents.id, row.id), eq(documents.userId, userId)));
      tokenById.set(row.id, token);
    }
  });

  return documentIds.map((id) => {
    const shareToken = tokenById.get(id);
    if (!shareToken) throw new Error("共有の有効化に失敗しました。");
    return { id, shareToken };
  });
}

/** 公開を停止する（トークンは破棄）。 */
export async function disableShare(id: string): Promise<void> {
  const userId = await requireUserId();
  const [row] = await db
    .update(documents)
    .set({ isPublic: false, shareToken: null, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning({ id: documents.id });
  assertMutation(row, "ファイルが見つかりません。");
}

// ===== アカウント / データ削除 =====

/**
 * ログイン中ユーザーのアカウントと保存データを削除する。
 *
 * Auth.js の account/session、Markdown Memory の folder/document は
 * users.id への外部キーで onDelete: "cascade" になっているため、
 * ユーザー行の削除をSSoTにする。
 */
export async function deleteCurrentUserAccount(): Promise<void> {
  const userId = await requireUserId();
  const [row] = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  assertMutation(row, "アカウントが見つかりません。");
}
