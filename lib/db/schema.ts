/**
 * Markdown Memory の DB スキーマ（Drizzle / PostgreSQL = Neon）。
 *
 * このファイルが「どのデータを DB に保存するか」の SSoT。
 * リポジトリに残すこと自体が、AI が指示なしで設計を読めるようにする狙い（ハーネス）。
 *
 * 構成:
 *   - Auth.js（NextAuth）管理テーブル: users / accounts / sessions / verificationTokens
 *   - アプリ本体テーブル: folders / documents
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

// ===== Auth.js 管理テーブル（@auth/drizzle-adapter の標準スキーマ） =====

/** ログインユーザー。Google サインインで作成される。 */
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

/** OAuth プロバイダ（Google）との紐付け情報。1 ユーザーに複数プロバイダ可。 */
export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<"oauth" | "oidc" | "email" | "webauthn">()
      .notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

/** DB セッション方式を使う場合のセッション保管。JWT 方式でも作成しておく。 */
export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

/** メール検証等で使うワンタイムトークン。Auth.js 標準。 */
export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ===== アプリ本体テーブル =====

/**
 * フォルダ。1 ユーザーに複数。ファイルの整理軸（1 ファイル = 1 フォルダ）。
 * ユーザー削除時はフォルダも連鎖削除する。
 */
export const folders = pgTable("folder", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Markdown ドキュメント本体（このアプリの主役データ）。
 *
 * - content: 本文。リロードしても消えないよう DB に永続化する中核。
 * - folderId: 所属フォルダ。ルート直下なら null。フォルダ削除時は null に戻す。
 * - isPublic / shareToken: 共有（公開リンク）用。shareToken は推測不能な一意トークン。
 * - updatedAt: 自動保存・「最近更新順」並び替えに使う。
 */
export const documents = pgTable("document", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  folderId: text("folder_id").references(() => folders.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  content: text("content").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(false),
  shareToken: text("share_token").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ===== 派生型（UI / Server Actions から import する） =====

export type User = typeof users.$inferSelect;
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
