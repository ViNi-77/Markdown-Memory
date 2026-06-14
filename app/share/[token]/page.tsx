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
    <main className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
          <FileText className="size-5 text-primary" />
          <h1 className="truncate font-heading text-base font-semibold">
            {doc.name}
          </h1>
          <span className="ml-auto shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
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

      <footer className="mx-auto max-w-3xl px-6 py-8 text-center text-xs text-muted-foreground">
        Markdown Memory で共有されています
      </footer>
    </main>
  );
}
