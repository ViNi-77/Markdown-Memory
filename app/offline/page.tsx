import Link from "next/link";
import { FileText, WifiOff } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 py-10 text-center">
      <div className="flex max-w-md flex-col items-center gap-5">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted">
          <WifiOff className="size-7 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            オフラインです
          </p>
          <h1 className="font-heading text-2xl font-semibold">
            Markdown Memory に接続できません
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ネットワークが戻ったら、再読み込みしてワークスペースを開いてください。
            非公開のMarkdown本文やAPI応答は端末にキャッシュしない設計です。
          </p>
        </div>
        <Link
          href="/demo"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <FileText />
          デモを開く
        </Link>
      </div>
    </main>
  );
}
