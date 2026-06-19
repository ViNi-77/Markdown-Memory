"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, LogOut, Settings2, ShieldCheck, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const AI_BROWSER_STORAGE_KEYS = [
  "markdown_memory_ai_provider",
  "markdown_memory_ai_key_claude",
  "markdown_memory_ai_key_gpt",
  "markdown_memory_ai_key_gemini",
  "markdown_memory_gemini_api_key",
];

type AccountMenuUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type AccountMenuProps = {
  user: AccountMenuUser;
  signOutAction: () => Promise<void>;
  deleteAccountAction: () => Promise<void>;
};

function clearBrowserAiData() {
  for (const key of AI_BROWSER_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
}

function DeleteAccountSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      <Trash2 />
      {pending ? "削除中" : "削除する"}
    </Button>
  );
}

export function AccountMenu({
  user,
  signOutAction,
  deleteAccountAction,
}: AccountMenuProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [browserDataMessage, setBrowserDataMessage] = useState("");
  const displayName = user.name ?? user.email ?? "アカウント";
  const initial = displayName.charAt(0).toUpperCase();

  function clearBrowserDataFromSettings() {
    clearBrowserAiData();
    setBrowserDataMessage("このブラウザに保存されたAIキーを削除しました。");
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5 shadow-xs ring-1 ring-border/80">
        <Avatar className="size-6">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback className="text-xs">{initial}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          {displayName}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="アカウント設定"
          aria-label="アカウント設定"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings2 />
        </Button>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="icon-sm"
            title="サインアウト"
            aria-label="サインアウト"
          >
            <LogOut />
          </Button>
        </form>
      </div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>アカウント設定</DialogTitle>
            <DialogDescription>
              保存データ、ブラウザ保存のAIキー、アカウント削除の扱いを確認できます。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 text-sm">
            <section className="rounded-lg border border-border bg-canvas/70 p-3">
              <div className="flex items-start gap-3">
                <Avatar className="size-9">
                  {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">{displayName}</p>
                  {user.email ? (
                    <p className="truncate text-muted-foreground">
                      {user.email}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="grid gap-1">
                  <h2 className="font-medium">保存データ</h2>
                  <p className="leading-relaxed text-muted-foreground">
                    Markdown本文、フォルダ、共有リンク、Googleログインに紐づくアカウント情報は
                    Neon PostgreSQL
                    に保存されます。アカウント削除時にこれらの保存データも削除されます。
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/privacy"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                  )}
                >
                  Terms
                </Link>
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="grid gap-1">
                  <h2 className="font-medium">このブラウザのAIキー</h2>
                  <p className="leading-relaxed text-muted-foreground">
                    Provider別APIキーはサーバーやDBに保存せず、このブラウザの
                    localStorage
                    にのみ保存します。共有端末では、必要に応じて削除してください。
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearBrowserDataFromSettings}
                >
                  <KeyRound />
                  AIキーを削除
                </Button>
                {browserDataMessage ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    {browserDataMessage}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="grid gap-3 rounded-lg border border-destructive/30 bg-card p-3">
              <div className="grid gap-1">
                <h2 className="font-medium text-destructive">
                  アカウントと保存データの削除
                </h2>
                <p className="leading-relaxed text-muted-foreground">
                  Markdown本文、フォルダ、共有リンク、Auth.jsのアカウント連携を削除します。
                  削除後は復元できません。
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="w-fit"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 />
                アカウントと保存データを削除
              </Button>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>
              アカウントと保存データを削除しますか？
            </AlertDialogTitle>
            <AlertDialogDescription>
              Markdown本文、フォルダ、共有リンク、ログイン連携を削除します。
              この操作は取り消せません。ブラウザに保存されたAIキーも、この端末から削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">キャンセル</AlertDialogCancel>
            <form
              action={deleteAccountAction}
              onSubmit={() => {
                clearBrowserAiData();
              }}
            >
              <DeleteAccountSubmitButton />
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
