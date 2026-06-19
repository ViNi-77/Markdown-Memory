# Markdown Memory 運用手順

このドキュメントは、公開MVP以降の小さな運用ルールをまとめたものです。目的は「いきなり本番を壊さない」「問題が起きたときに追える」「公開リポジトリに秘密情報を置かない」ことです。

## フェーズ5 A-E の対象

| 区分 | 内容                 | 今回の状態                                                                           |
| ---- | -------------------- | ------------------------------------------------------------------------------------ |
| A    | CI/CD                | GitHub Actions で lint / test / build / format / E2E / 高リスク脆弱性チェックを実行  |
| B    | E2E テスト           | Playwright で `/demo` の作成・編集・プレビューを確認                                 |
| C    | 監視・エラー把握     | Vercel Analytics / Speed Insights、`/api/health`、Cron内部ヘルスチェック、構造化ログ |
| D    | バックアップ         | Neon の復元機能、手動 `pg_dump`、復元ドリル手順                                      |
| E    | 利用者フィードバック | GitHub Issue Template、PR Template、アプリ内・スマホ下部のフィードバック導線         |

## モバイル / PWA 前段

スマホ対応とPWA化は、まず閲覧導線を壊さない自動確認と、安全なPWA下地から進めます。

- `/demo` をスマホ幅で開ける
- ファイル一覧から本文・詳細ペインへ移動できる
- Markdown本文を読める
- manifest、PNG/SVGアイコン、オフラインページ、Service Worker を用意する
- ログイン後のMarkdown本文、API応答、共有ページはキャッシュしない
- Service Worker のオフライン fallback とキャッシュ対象外パスをE2Eで確認する
- 長いURL、表、コードブロックがスマホ幅の本文ペイン全体を横に押し出さないことをE2Eで確認する
- ホーム画面追加、起動先、オフライン導線は実機チェックリストで記録する
- ログイン後ワークスペース、共有ページ、API応答は端末へ永続保存しない
- PWA実装済み範囲と実機確認待ちの境界はリリース判定メモで確認する

詳細:

- [`docs/MOBILE_PWA_PREP.md`](MOBILE_PWA_PREP.md)
- [`docs/PWA_REAL_DEVICE_CHECK.md`](PWA_REAL_DEVICE_CHECK.md)
- [`docs/PWA_OFFLINE_DATA_POLICY.md`](PWA_OFFLINE_DATA_POLICY.md)
- [`docs/PWA_PHASE7_HANDOFF.md`](PWA_PHASE7_HANDOFF.md)
- [`docs/PRODUCTION_SMOKE_CHECK.md`](PRODUCTION_SMOKE_CHECK.md)

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

## main ブランチ保護

`main` は branch protection rule で保護します。推奨設定は以下です。

- `main` への Pull Request 必須
- `品質ゲート` の status check 必須
- branch を最新化してから merge
- conversation resolution 必須
- force push 不可
- branch deletion 不可

詳細: [`docs/BRANCH_PROTECTION.md`](BRANCH_PROTECTION.md)

## Vercel 確認

PR を作ると Vercel Preview が作成されます。Preview で最低限以下を確認します。

- `/demo` が開く
- ログイン画面が表示される
- Markdown の作成・編集・プレビューができる
- 共有や認証まわりに意図しない挙動がない

Production 反映後は以下を確認します。

- `https://markdown-memory.vercel.app`
- `https://markdown-memory.vercel.app/demo`
- `https://markdown-memory.vercel.app/privacy`
- `https://markdown-memory.vercel.app/terms`
- `https://markdown-memory.vercel.app/api/health`

ログイン後ワークスペース、DB保存、共有URL、AI連携、本番ログを見る場合は [`docs/PRODUCTION_SMOKE_CHECK.md`](PRODUCTION_SMOKE_CHECK.md) に沿って確認します。

モバイル/PWAに触れる変更では、必要に応じて [`docs/PWA_REAL_DEVICE_CHECK.md`](PWA_REAL_DEVICE_CHECK.md) に沿って Apple Safari の実機確認を記録します。

端末保存やオフライン閲覧に触れる変更では、[`docs/PWA_OFFLINE_DATA_POLICY.md`](PWA_OFFLINE_DATA_POLICY.md) の許可/禁止/将来条件を確認します。

Phase 7のPWA実装範囲を確認するときは、[`docs/PWA_PHASE7_HANDOFF.md`](PWA_PHASE7_HANDOFF.md) を見ます。Apple Safari の結果が記録されていれば、PWAは「実装完了・Apple実機確認済み」として扱います。

## Privacy / Terms / アカウント削除

Season 1 Phase 12 以降は、TestFlightへ進む前提として、Web/PWAでもデータの扱いと削除導線を見える状態にします。

- `/privacy` で保存データ、共有リンク、AIキー、削除方針を説明する
- `/terms` で利用範囲、共有リンク、AI出力、削除前の注意点を説明する
- ログイン後のアカウント設定から Privacy / Terms へ進める
- Provider APIキーはブラウザ `localStorage` 保存で、DBには保存しない
- アカウント削除時は `user` 行を削除し、Auth.jsの連携、フォルダ、Markdown本文、共有リンクをcascadeで削除する
- 削除操作は確認ダイアログ付きにし、下部ナビなど誤タップしやすい場所には直接置かない

Apple公式の [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/) は、App Store提出アプリがアカウント作成をサポートする場合、アプリ内でアカウント削除を開始できる必要があると説明しています。Season 1ではApp Store本番公開は扱いませんが、TestFlight前の品質として前倒しで用意します。

## 監視・ログ

現在の標準監視は以下です。

- Vercel Web Analytics
- Vercel Speed Insights
- Vercel Runtime Logs
- `/api/health`
- `/api/cron/health`
- `/api/ai` の構造化ログ
- 任意の外部エラー通知Webhook

AI API のログには Markdown 本文、Provider API キー、DB 接続URLを出しません。記録するのは、リクエストID、選択Provider、モデルID、処理結果、HTTPステータス、処理時間などの運用メタデータだけです。

本番で問題が出た場合は、Vercel Dashboard の Runtime Logs で `ai.request.failed` や 500 エラーを確認します。

### AI Gateway / BYOK

アプリ内AIは Claude / GPT / Gemini を Vercel AI Gateway 経由で呼び出します。Production では Vercel の OIDC 認証を基本にし、ローカルやCIなど静的キーが必要な環境では `AI_GATEWAY_API_KEY` を使います。

確認項目:

- Vercel Project の AI Gateway が有効になっている
- 必要なら AI Gateway Credits または Vercel 側 BYOK が設定されている
- ローカルで Gateway を使う場合は `vercel env pull` で OIDC token を更新するか、`AI_GATEWAY_API_KEY` を設定する
- モデルを変える場合は `AI_MODEL_CLAUDE`、`AI_MODEL_GPT`、`AI_MODEL_GEMINI` を設定する
- `GEMINI_API_KEY` / `GEMINI_MODEL` は Geminiモードの legacy fallback としてだけ使う

ユーザーが画面で入力したProvider APIキーはブラウザの `localStorage` にProvider別で保存され、AI実行時だけ `/api/ai` に送られます。Markdown Memory のDBには保存しません。

Phase 9 以降のアプリ内AIでは、Pane 4 で選択中Provider、APIキー保存状態、保存/削除操作を分けて表示します。空欄の場合は AI Gateway またはサーバー側設定を使う可能性だけを案内し、設定有無をUIで断定しません。AI提案を本文へ反映する場合、末尾への追記とコピーは軽い操作として扱い、本文置き換えは確認ダイアログを挟みます。

Phase 10A では、画面を開いている間だけAI提案の一時履歴を最大5件保持します。一時履歴はDBや `localStorage` には保存せず、再読み込みで消えます。永続的なAI履歴保存、モデル選択UI、ストリーミング、複数ファイル一括AIは採用していません。モデルは引き続き `AI_MODEL_CLAUDE`、`AI_MODEL_GPT`、`AI_MODEL_GEMINI` と既定値で管理します。

### ヘルスチェック

`/api/health` は外部から見える軽量チェックです。秘密値や環境変数の設定有無は返しません。

`/api/cron/health` は Vercel Cron 用の内部チェックです。`CRON_SECRET` を Vercel Environment Variables に設定し、Vercel Cron から `Authorization: Bearer <CRON_SECRET>` 付きで呼び出します。

チェック内容:

- `DATABASE_URL`
- `AUTH_SECRET` または `NEXTAUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_URL` または `NEXTAUTH_URL`

Cron は毎日 07:00 JST（22:00 UTC）に動きます。必須設定が不足している場合は `cron.health.degraded` を Runtime Logs と任意Webhookに記録します。

### 外部エラー通知

`ERROR_REPORT_WEBHOOK_URL` を Vercel Environment Variables に設定すると、予期しないサーバーエラーをHTTPS Webhookへ通知できます。

通知には以下を含めます。

- service
- event
- environment
- route
- requestId
- status
- ms
- errorName
- redacted errorMessage

通知には以下を含めません。

- Markdown 本文
- APIキー
- DB接続URL
- stack trace
- email

## 外部エラー追跡の判断

Phase 6 では、Sentry などの外部エラー追跡はまだ導入しません。現時点では、Vercel Runtime Logs、`/api/health`、`/api/cron/health`、任意Webhook通知で小さく運用します。

理由:

- まだ積極的な一般公開前で、外部サービスへ送る情報を最小化したい
- Markdown本文、APIキー、DB接続URL、メールなどを誤送信しない設計を優先したい
- 現在の規模では、Vercel側のログとWebhook通知で一次対応できる

外部エラー追跡を導入する条件:

- Markdown 本文を送信しない
- APIキーや接続URLを送信しない
- user id や email の扱いを明示してから有効化する
- Source Map 用のトークンは Vercel / GitHub Secrets に置き、リポジトリに置かない
- Source Map を公開する場合、ブラウザで見えてよい情報だけが含まれることを確認する
- エラーイベントの `beforeSend` 相当の処理で本文、URLクエリ、メール、トークンを削除する
- 導入後も、GitHub Issues に秘密情報を貼らない案内を続ける

## バックアップ

Neon PostgreSQL は、ダッシュボード側の復元機能を第一のバックアップ手段にします。加えて、節目のリリース前後は手動バックアップを取れるようにします。

手動バックアップ:

```bash
npm run db:backup
```

バックアップファイルはリポジトリに置きません。ローカルの安全な場所、またはアクセス制限されたストレージに保存します。

復元練習は、本番DBではなく検証用DBで行います。

推奨タイミング:

- DBスキーマを変更する前
- 大きめのリリース前後
- 月1回の復元ドリル

復元ドリルの結果は、GitHub Issue またはローカルの運用メモに「日時、バックアップファイル名、検証用DB、確認結果」だけを残します。DB接続URLや個人情報は書きません。

詳細: [`docs/BACKUP_RESTORE.md`](BACKUP_RESTORE.md)

## 利用者フィードバック

GitHub Issues を小さな受付窓口にします。

- 不具合報告: `.github/ISSUE_TEMPLATE/bug_report.yml`
- 改善提案: `.github/ISSUE_TEMPLATE/feature_request.yml`
- モバイル/PWA: `.github/ISSUE_TEMPLATE/mobile_pwa_feedback.yml`
- アプリ内: 左下の `フィードバック` リンク
- スマホ幅: 画面下部の `送信` リンク

Issue には APIキー、DB接続URL、個人情報、非公開Markdown本文を貼らないよう案内します。

### 分類ルール

| 種類               | 使うテンプレート           | 見るポイント                                              |
| ------------------ | -------------------------- | --------------------------------------------------------- |
| 不具合             | `bug_report.yml`           | 再現手順、利用環境、期待した動き、現在の回避策            |
| 改善提案           | `feature_request.yml`      | 困っている場面、日常利用への影響、既存機能で代替できるか  |
| スマホ / PWA       | `mobile_pwa_feedback.yml`  | 端末、ブラウザ、読む体験への影響、インストール/オフライン |
| セキュリティ懸念   | `SECURITY.md` の案内を優先 | 公開Issueに詳細を書かず、個別連絡または非公開経路で扱う   |
| 運用・ドキュメント | 通常Issueまたは改善提案    | README/docsで迷いを減らせるか                             |

### 優先度の見方

| 優先度 | 目安                                                   |
| ------ | ------------------------------------------------------ |
| 高     | ログイン、保存、共有、本文閲覧、秘密情報保護に影響する |
| 中     | 日常利用で不便だが、回避策がある                       |
| 低     | あるとうれしい改善、見た目の微調整、将来検討           |

スマホの本文閲覧に関する問題は、Markdown Memory の中心価値に近いため、同じ影響度なら優先度を一段上げます。

### 秘密情報や個人情報が貼られた場合

1. そのIssueには追加で詳細を書き込まない
2. 必要ならIssueを非表示、削除、または編集できる権限者に対応を依頼する
3. APIキー、OAuth Secret、DB接続URLが含まれる場合は即時ローテーションする
4. 非公開Markdown本文や個人情報が含まれる場合は、公開範囲と影響を確認する
5. 対応後、再発防止としてテンプレートやREADMEの注意書きを見直す

### 見返しタイミング

- 週1回または節目のリリース前にOpen Issueを確認する
- 同じ種類の報告が2件以上続いたら、改善Issueとしてまとめる
- 月1回、スマホ/PWAフィードバックを見返し、Phase 7以降の候補に移す

## 公開リポジトリの注意

以下は絶対にコミットしません。

- `.env.local`
- `.vercel`
- 実値入りの APIキー
- OAuth Client Secret
- DB 接続URL
- ローカルログ
- DB バックアップファイル
- 非公開 Markdown 本文
- ユーザーのメールアドレスや個人情報
- `.agents`
- `.antigravity`
- `.claude`

README は初見ユーザー向けの入口として保ち、運用・Phase記録・Production スモークなどの詳細は [`docs/MAINTAINERS.md`](MAINTAINERS.md) から参照します。

Production スモークやスクリーンショット確認では、公開されても困らないテスト用 Markdown だけを使います。確認後はテスト用ファイルを削除し、共有リンクを作った場合は共有を解除します。
