import type { DefaultSession } from "next-auth";

// session.user.id（DBのユーザーID）を型に追加する。
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
