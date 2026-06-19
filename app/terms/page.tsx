import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Share2, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Terms | Markdown Memory",
  description:
    "Markdown Memoryの利用条件、共有リンク、AI機能、アカウント削除の注意点を説明します。",
};

export default function TermsPage() {
  return (
    <main className="min-h-dvh bg-canvas text-foreground">
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-4 border-b border-border pb-6">
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "w-fit",
            )}
          >
            <ArrowLeft />
            戻る
          </Link>
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary shadow-xs ring-1 ring-border/80">
              <FileText className="size-5" />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                最終更新: 2026-06-20
              </p>
              <h1 className="font-heading text-2xl font-semibold">
                Terms of Use
              </h1>
              <p className="leading-relaxed text-muted-foreground">
                Markdown Memory
                は、Markdownの保存、編集、共有、AI再利用を支援する個人用ワークスペースです。
                利用前に、以下の条件と注意点を確認してください。
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">利用範囲</h2>
          <p className="leading-relaxed text-muted-foreground">
            このアプリは、個人のMarkdownメモやAI生成物を整理するためのツールです。
            法律、医療、金融、採用、契約などの重要判断を行う前には、内容をユーザー自身で確認してください。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">ユーザーの責任</h2>
          <p className="leading-relaxed text-muted-foreground">
            ユーザーは、保存・共有するMarkdownの内容について責任を負います。
            他者の個人情報、秘密情報、権利侵害のおそれがある内容を、許可なく保存・共有しないでください。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Share2 className="size-5 text-primary" />
            共有リンク
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            共有リンクを有効にしたMarkdownは、URLを知っている人が閲覧できます。
            機密情報や公開したくない内容では共有リンクを作らないでください。
            共有解除またはファイル削除により、共有URLからの閲覧を停止できます。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Sparkles className="size-5 text-primary" />
            AI機能
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            アプリ内AIは Claude / GPT / Gemini またはサーバー側AI
            Gatewayへ本文を送信して処理します。
            AIの出力は不正確な場合があります。重要な内容に使う前に、ユーザー自身で内容を確認してください。
            Provider
            APIキーを入力する場合、キーの利用料金や利用条件は各Providerの規約に従います。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">アカウント削除</h2>
          <p className="leading-relaxed text-muted-foreground">
            ログイン後のアカウント設定から、アカウントと保存データを削除できます。
            削除すると、Markdown本文、フォルダ、共有リンク、ログイン連携は復元できません。
            必要なMarkdownは削除前にダウンロードしてください。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">変更と停止</h2>
          <p className="leading-relaxed text-muted-foreground">
            Markdown Memory は個人開発のポートフォリオプロダクトです。
            機能、仕様、提供方法、利用条件は、改善や運用上の都合により変更される場合があります。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">連絡先</h2>
          <p className="leading-relaxed text-muted-foreground">
            不具合や相談は GitHub Issues から連絡できます。公開Issueには、
            APIキー、非公開Markdown本文、個人情報を貼らないでください。
          </p>
          <a
            href="https://github.com/ViNi-77/Markdown-Memory/issues/new/choose"
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          >
            GitHub Issues を開く
          </a>
        </section>
      </article>
    </main>
  );
}
