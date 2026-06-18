import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { auth } from "@/auth";
import { getOwnedDocument } from "@/lib/data";
import { MarkdownView } from "@/components/markdown/MarkdownView";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const doc = await getOwnedDocument(id);
  if (!doc) notFound();

  return (
    <main className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-card/95 shadow-2xs">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-4">
          <FileText className="size-5 shrink-0 text-primary" />
          <h1 className="min-w-0 flex-1 truncate font-heading text-base font-semibold">
            {doc.name}
          </h1>
          <span className="hidden shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground sm:inline-flex">
            全画面表示
          </span>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeft />
            戻る
          </Link>
        </div>
      </header>

      <article className="markdown-reading-surface markdown-reading-surface-wide">
        {doc.content.trim() ? (
          <MarkdownView content={doc.content} />
        ) : (
          <p className="text-sm text-muted-foreground">本文は空です。</p>
        )}
      </article>
    </main>
  );
}
