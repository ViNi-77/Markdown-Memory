import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { folders, documents } from "@/lib/db/schema";
import type { Folder, Document } from "@/lib/db/schema";

/**
 * ログイン中ユーザーのフォルダとドキュメントをまとめて取得する。
 * Server Component（app/page.tsx）から呼び、初期表示データとして渡す。
 */
export async function getWorkspaceData(): Promise<{
  folders: Folder[];
  documents: Document[];
}> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { folders: [], documents: [] };

  const [folderRows, docRows] = await Promise.all([
    db
      .select()
      .from(folders)
      .where(eq(folders.userId, userId))
      .orderBy(asc(folders.createdAt)),
    db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.updatedAt)),
  ]);

  return { folders: folderRows, documents: docRows };
}

/** ログイン中ユーザーが所有するドキュメントを1件取得する（全画面表示用）。 */
export async function getOwnedDocument(
  documentId: string,
): Promise<Document | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 公開トークンから閲覧専用でドキュメントを1件取得する（共有ページ用・ログイン不要）。
 * isPublic が false のものは返さない。
 */
export async function getPublicDocument(
  token: string,
): Promise<Document | null> {
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.shareToken, token), eq(documents.isPublic, true)))
    .limit(1);
  return rows[0] ?? null;
}
