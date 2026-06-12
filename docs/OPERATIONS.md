# Markdown Memory 運用手順

このドキュメントは、公開MVP以降の小さな運用ルールをまとめたものです。目的は「いきなり本番を壊さない」「問題が起きたときに追える」「公開リポジトリに秘密情報を置かない」ことです。

## フェーズ5 A-E の対象

| 区分 | 内容                 | 今回の状態                                                                          |
| ---- | -------------------- | ----------------------------------------------------------------------------------- |
| A    | CI/CD                | GitHub Actions で lint / test / build / format / E2E / 高リスク脆弱性チェックを実行 |
| B    | E2E テスト           | Playwright で `/demo` の作成・編集・プレビューを確認                                |
| C    | 監視・エラー把握     | Vercel Analytics / Speed Insights、`/api/health`、AI API の構造化ログ               |
| D    | バックアップ         | Neon の復元機能と `pg_dump` 手順を運用ルール化                                      |
| E    | 利用者フィードバック | GitHub Issue Template と PR Template を追加                                         |

## 開発フロー

1. `main` から `codex/...` または機能名のブランチを作る
2. ブランチで実装する
3. ローカルで必要なチェックを通す
4. GitHub に push して Pull Request を作る
5. Vercel Preview と GitHub Actions の結果を確認する
6. 問題がなければ `main` にマージする
7. Vercel Production の動作を確認する

`main` へ直接 push しない運用を標準にします。

## ローカル確認

```bash
npm run lint
npm test
npm run build
npm run format:check
npm run test:e2e
```

E2E は Playwright を使います。初回だけブラウザが必要な場合があります。

```bash
npx playwright install chromium
```

## GitHub Actions

`.github/workflows/ci.yml` で以下を実行します。

- ESLint
- Vitest
- Next.js build
- Prettier check
- production dependencies の high 以上の `npm audit`
- Playwright E2E

PR ではこのチェックを確認してからマージします。

## Vercel 確認

PR を作ると Vercel Preview が作成されます。Preview で最低限以下を確認します。

- `/demo` が開く
- ログイン画面が表示される
- Markdown の作成・編集・プレビューができる
- 共有や認証まわりに意図しない挙動がない

Production 反映後は以下を確認します。

- `https://markdown-memory.vercel.app`
- `https://markdown-memory.vercel.app/demo`
- `https://markdown-memory.vercel.app/api/health`

## 監視・ログ

現在の標準監視は以下です。

- Vercel Web Analytics
- Vercel Speed Insights
- Vercel Runtime Logs
- `/api/health`
- `/api/ai` の構造化ログ

AI API のログには Markdown 本文、Gemini API キー、DB 接続URLを出しません。記録するのは、リクエストID、処理結果、HTTPステータス、処理時間などの運用メタデータだけです。

本番で問題が出た場合は、Vercel Dashboard の Runtime Logs で `ai.request.failed` や 500 エラーを確認します。

## エラー追跡の次候補

次の段階で、Sentry などの外部エラー追跡を検討します。導入する場合も、以下を守ります。

- Markdown 本文を送信しない
- APIキーや接続URLを送信しない
- user id や email の扱いを明示してから有効化する
- Source Map 用のトークンは Vercel / GitHub Secrets に置き、リポジトリに置かない

## バックアップ

Neon PostgreSQL は、ダッシュボード側の復元機能を第一のバックアップ手段にします。加えて、節目のリリース前後は手動バックアップを取れるようにします。

例:

```bash
pg_dump "$DATABASE_URL" --format=custom --file markdown-memory-YYYYMMDD.dump
```

バックアップファイルはリポジトリに置きません。ローカルの安全な場所、またはアクセス制限されたストレージに保存します。

復元練習は、本番DBではなく検証用DBで行います。

## 利用者フィードバック

GitHub Issues を小さな受付窓口にします。

- 不具合報告: `.github/ISSUE_TEMPLATE/bug_report.yml`
- 改善提案: `.github/ISSUE_TEMPLATE/feature_request.yml`

Issue には APIキー、DB接続URL、個人情報、非公開Markdown本文を貼らないよう案内します。

## 公開リポジトリの注意

以下は絶対にコミットしません。

- `.env.local`
- `.vercel`
- 実値入りの APIキー
- OAuth Client Secret
- DB 接続URL
- ローカルログ
- DB バックアップファイル
