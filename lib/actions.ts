"use server";

import { and, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { folders, documents } from "@/lib/db/schema";
import type { Folder, Document } from "@/lib/db/schema";

/** ログイン中ユーザーIDを取得。未ログインなら例外。全アクションの入口で所有者を確定する。 */
async function requireUserId(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("認証が必要です。サインインしてください。");
  return userId;
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
  await db
    .update(folders)
    .set({ name: trimmed })
    .where(and(eq(folders.id, id), eq(folders.userId, userId)));
}

export async function deleteFolder(id: string): Promise<void> {
  const userId = await requireUserId();
  // documents.folderId は onDelete: "set null" なので、中のファイルはルートへ戻る（削除しない）。
  await db
    .delete(folders)
    .where(and(eq(folders.id, id), eq(folders.userId, userId)));
}

// ===== ドキュメント =====

export async function createDocument(input: {
  name: string;
  content?: string;
  folderId?: string | null;
}): Promise<Document> {
  const userId = await requireUserId();
  const name = input.name.trim() || "無題.md";
  const [row] = await db
    .insert(documents)
    .values({
      userId,
      name,
      content: input.content ?? "",
      folderId: input.folderId ?? null,
    })
    .returning();
  return row;
}

export async function updateDocumentContent(
  id: string,
  content: string,
): Promise<void> {
  const userId = await requireUserId();
  await db
    .update(documents)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}

export async function renameDocument(id: string, name: string): Promise<void> {
  const userId = await requireUserId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("ファイル名を入力してください。");
  await db
    .update(documents)
    .set({ name: trimmed, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}

export async function moveDocument(
  id: string,
  folderId: string | null,
): Promise<void> {
  const userId = await requireUserId();
  await db
    .update(documents)
    .set({ folderId, updatedAt: new Date() })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}

export async function deleteDocument(id: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .delete(documents)
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}

// ===== 共有（Phase 6 で UI 接続） =====

/** 公開リンクを発行（or 既存トークンを返す）して on にする。 */
export async function enableShare(id: string): Promise<string> {
  const userId = await requireUserId();
  const token = randomBytes(16).toString("base64url");
  const [row] = await db
    .update(documents)
    .set({ isPublic: true, shareToken: token })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)))
    .returning({ shareToken: documents.shareToken });
  if (!row?.shareToken) throw new Error("共有の有効化に失敗しました。");
  return row.shareToken;
}

/** 公開を停止する（トークンは破棄）。 */
export async function disableShare(id: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .update(documents)
    .set({ isPublic: false, shareToken: null })
    .where(and(eq(documents.id, id), eq(documents.userId, userId)));
}
