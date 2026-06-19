import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Database, KeyRound, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Privacy | Markdown Memory",
  description:
    "Markdown Memoryで扱うデータ、保存先、AIキー、共有リンク、削除方針を説明します。",
};

export default function PrivacyPage() {
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
              <ShieldCheck className="size-5" />
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                最終更新: 2026-06-20
              </p>
              <h1 className="font-heading text-2xl font-semibold">
                Privacy Policy
              </h1>
              <p className="leading-relaxed text-muted-foreground">
                Markdown Memory
                は、AIが生成したMarkdownを保存・整理・共有するための個人用ワークスペースです。
                このページでは、アプリが扱うデータと削除方針を説明します。
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Database className="size-5 text-primary" />
            保存するデータ
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-border">
                <tr>
                  <th className="w-36 bg-canvas/60 px-3 py-3 text-left font-medium">
                    アカウント
                  </th>
                  <td className="px-3 py-3 text-muted-foreground">
                    Googleログインで取得するユーザーID、名前、メールアドレス、プロフィール画像を
                    Auth.js と Neon PostgreSQL に保存します。
                  </td>
                </tr>
                <tr>
                  <th className="w-36 bg-canvas/60 px-3 py-3 text-left font-medium">
                    Markdown
                  </th>
                  <td className="px-3 py-3 text-muted-foreground">
                    作成・アップロードしたMarkdown本文、ファイル名、フォルダ、更新日時を
                    Neon PostgreSQL に保存します。
                  </td>
                </tr>
                <tr>
                  <th className="w-36 bg-canvas/60 px-3 py-3 text-left font-medium">
                    共有
                  </th>
                  <td className="px-3 py-3 text-muted-foreground">
                    公開リンクを作成したファイルだけ、共有状態と推測困難な共有トークンを保存します。
                    共有を解除するとトークンは破棄されます。
                  </td>
                </tr>
                <tr>
                  <th className="w-36 bg-canvas/60 px-3 py-3 text-left font-medium">
                    AI
                  </th>
                  <td className="px-3 py-3 text-muted-foreground">
                    アプリ内AIに送信した本文は、選択したProviderまたはAI
                    Gatewayへ処理のために送信されます。
                    AI提案の一時履歴は画面を開いている間だけ保持し、DBには保存しません。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-3">
          <h2 className="flex items-center gap-2 font-heading text-lg font-semibold">
            <KeyRound className="size-5 text-primary" />
            Provider APIキー
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            ユーザーが入力した Claude / GPT / Gemini のProvider APIキーは、
            ブラウザの localStorage
            にProvider別で保存されます。アプリのDBには保存しません。
            AI実行時だけサーバーへ送信され、レスポンスやログにAPIキー全文を表示しない設計です。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">
            共有リンクと公開範囲
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            共有リンクを有効にしたMarkdownは、URLを知っている人がログインなしで閲覧できます。
            非公開に戻す、またはファイルを削除すると、その共有URLでは本文を読めなくなります。
            公開したくない内容では共有リンクを作成しないでください。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">
            アカウント削除とデータ削除
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            ログイン後のアカウント設定から、アカウントと保存データを削除できます。
            削除すると、Googleログイン連携、Markdown本文、フォルダ、共有リンクが削除されます。
            このブラウザに保存されたProvider
            APIキーも、削除操作時にlocalStorageから削除します。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">分析と運用ログ</h2>
          <p className="leading-relaxed text-muted-foreground">
            アプリ品質の確認に Vercel Analytics、Speed Insights、Runtime Logs
            を使います。Runtime Logs にはAPIキー、DB接続URL、OAuth
            Secret、Markdown本文全文を残さない方針です。
          </p>
        </section>

        <section className="grid gap-3">
          <h2 className="font-heading text-lg font-semibold">連絡先</h2>
          <p className="leading-relaxed text-muted-foreground">
            不具合、削除に関する相談、データの扱いに関する質問は GitHub Issues
            から連絡できます。公開Issueには、APIキー、非公開Markdown本文、個人情報を貼らないでください。
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
