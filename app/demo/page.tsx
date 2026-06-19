import Link from "next/link";
import { LogIn } from "lucide-react";
import { MarkdownWorkspace } from "@/components/markdown/MarkdownWorkspace";
import { buttonVariants } from "@/components/ui/button";
import { demoDocuments, demoFolders } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function DemoUserSlot() {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-card px-2 py-2 shadow-xs ring-1 ring-border/80">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">デモモード</span>
        <span className="text-xs leading-relaxed text-muted-foreground">
          保存と共有はログイン後に使えます。
        </span>
      </div>
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <LogIn />
        ログイン
      </Link>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <MarkdownWorkspace
      demoMode
      initialFolders={demoFolders}
      initialDocuments={demoDocuments}
      userSlot={<DemoUserSlot />}
    />
  );
}
