import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getPublicDocument } from "@/lib/data";
import { MarkdownView } from "@/components/markdown/MarkdownView";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const doc = await getPublicDocument(token);
  if (!doc) notFound();

  return (
    <main className="min-h-dvh bg-canvas">
      <header className="border-b border-border bg-card/95 shadow-2xs">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
          <FileText className="size-5 text-primary" />
          <h1 className="truncate font-heading text-base font-semibold">
            {doc.name}
          </h1>
          <span className="ml-auto shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
            共有ドキュメント（閲覧専用）
          </span>
        </div>
      </header>

      <article className="markdown-reading-surface">
        {doc.content.trim() ? (
          <MarkdownView content={doc.content} />
        ) : (
          <p className="text-sm text-muted-foreground">本文は空です。</p>
        )}
      </article>

      <footer className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-6 py-8 text-center text-xs text-muted-foreground">
        <span>Markdown Memory で共有されています</span>
        <Link href="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-foreground">
          Terms
        </Link>
      </footer>
    </main>
  );
}
