/**
 * Auth.js (NextAuth v5) の設定。Google サインイン + Drizzle アダプタ。
 *
 * - アダプタが users / accounts テーブルにログイン情報を永続化する（＝ログインがDBに残る）。
 * - セッションは JWT 方式。middleware/edge で DB を引かずに済み、構成がシンプル。
 * - session.user.id に DB のユーザーIDを載せ、Server Actions で所有者判定に使う。
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions, verificationTokens } from "@/lib/db/schema";
import { getAuthSecret } from "@/lib/auth-runtime";

const adapter = process.env.DATABASE_URL
  ? DrizzleAdapter(db, {
      usersTable: users,
      accountsTable: accounts,
      sessionsTable: sessions,
      verificationTokensTable: verificationTokens,
    })
  : undefined;

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Vercel 本番ではホスト検証を信頼する（AUTH_URL 未設定でも動作）
  trustHost: true,
  secret: getAuthSecret(),
  ...(adapter ? { adapter } : {}),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
