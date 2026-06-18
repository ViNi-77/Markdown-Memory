import Link from "next/link";
import { FileText, ShieldCheck, WifiOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-6 text-foreground sm:px-6">
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-2xl flex-col justify-center">
        <div className="rounded-lg border border-border bg-card px-5 py-7 shadow-lg sm:px-8 sm:py-9">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary shadow-xs ring-1 ring-border/80">
                <WifiOff className="size-6 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">
                  オフラインです
                </p>
                <h1 className="font-heading text-xl font-semibold sm:text-2xl">
                  Markdown Memory に接続できません
                </h1>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              ネットワークが戻ったら、ワークスペースを開き直してください。
              非公開のMarkdown本文、API応答、共有ページは端末にキャッシュしない設計です。
            </p>

            <div className="rounded-md border border-border bg-canvas/70 px-3 py-3">
              <div className="flex items-start gap-2 text-sm">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="leading-relaxed text-muted-foreground">
                  オフライン時に見えるのは、この案内画面とデモ用の安全な静的資産だけです。
                  ログイン後のMarkdown本文は、明示的な仕様が決まるまで端末保存しません。
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Link href="/" className={cn(buttonVariants())}>
                <FileText />
                ワークスペースを開く
              </Link>
              <Link
                href="/demo"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                デモを開く
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
