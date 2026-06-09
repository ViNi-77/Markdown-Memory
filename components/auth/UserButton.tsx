import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * ログイン中ユーザーの表示とサインアウト。
 * Phase 5 で 4ペイン UI に統合する暫定配置（現状は右上に固定表示）。
 */
export async function UserButton() {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;

  const initial = (user.name ?? user.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5 ring-1 ring-foreground/10">
      <Avatar className="size-6">
        {user.image ? <AvatarImage src={user.image} alt="" /> : null}
        <AvatarFallback className="text-xs">{initial}</AvatarFallback>
      </Avatar>
      <span className="max-w-32 truncate text-sm text-foreground">
        {user.name ?? user.email}
      </span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button
          type="submit"
          variant="ghost"
          size="icon-sm"
          title="サインアウト"
        >
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
