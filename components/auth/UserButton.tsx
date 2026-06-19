import { auth, signOut } from "@/auth";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { deleteCurrentUserAccount } from "@/lib/actions";

/**
 * ログイン中ユーザーの表示とサインアウト。
 * Phase 5 で 4ペイン UI に統合する暫定配置（現状は右上に固定表示）。
 */
export async function UserButton() {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  return (
    <AccountMenu
      user={{
        name: user.name,
        email: user.email,
        image: user.image,
      }}
      signOutAction={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
      deleteAccountAction={async () => {
        "use server";
        await deleteCurrentUserAccount();
        await signOut({ redirectTo: "/login?accountDeleted=1" });
      }}
    />
  );
}
