# Markdown Memory メンテナ向けメモ

この文書は、公開リポジトリの README に載せすぎない運用・確認手順への入口です。README は初見ユーザーがアプリの目的、機能、ローカル起動を把握するための場所として保ちます。

## 運用ドキュメント

| ドキュメント                                               | 用途                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| [`OPERATIONS.md`](OPERATIONS.md)                           | CI/CD、Vercel、監視、Issue運用、公開リポジトリの注意 |
| [`BRANCH_PROTECTION.md`](BRANCH_PROTECTION.md)             | main ブランチ保護の推奨設定                          |
| [`BACKUP_RESTORE.md`](BACKUP_RESTORE.md)                   | Neon バックアップと復元ドリル                        |
| [`PRODUCTION_SMOKE_CHECK.md`](PRODUCTION_SMOKE_CHECK.md)   | Production のログイン後保存、共有、AI、運用確認      |
| [`SEASON1_ROADMAP.md`](SEASON1_ROADMAP.md)                 | Season 1の完了条件とTestFlightまでのPhase配置        |
| [`SEASON1_PHASE13_CHECK.md`](SEASON1_PHASE13_CHECK.md)     | Phase 13のWeb/PWA最終品質と実機確認境界              |
| [`SEASON1_PHASE14_CHECK.md`](SEASON1_PHASE14_CHECK.md)     | Phase 14のREADMEポートフォリオ仕上げ記録             |
| [`MOBILE_PWA_PREP.md`](MOBILE_PWA_PREP.md)                 | モバイル/PWAの準備メモ                               |
| [`PWA_REAL_DEVICE_CHECK.md`](PWA_REAL_DEVICE_CHECK.md)     | Apple Safari 実機確認チェックリスト                  |
| [`PWA_OFFLINE_DATA_POLICY.md`](PWA_OFFLINE_DATA_POLICY.md) | オフライン時に保存してよい/いけないデータの方針      |
| [`PWA_PHASE7_HANDOFF.md`](PWA_PHASE7_HANDOFF.md)           | Phase 7 PWA 実装範囲と実機確認の境界                 |

## Production 設定

Vercel Production には以下を設定します。実値は Vercel Environment Variables またはローカルの `.env.local` に置き、リポジトリには置きません。

```text
DATABASE_URL
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_URL=https://markdown-memory.vercel.app
NEXTAUTH_URL=https://markdown-memory.vercel.app
GEMINI_API_KEY
GEMINI_MODEL
AI_GATEWAY_API_KEY
AI_MODEL_CLAUDE
AI_MODEL_GPT
AI_MODEL_GEMINI
ERROR_REPORT_WEBHOOK_URL
CRON_SECRET
```

`DATABASE_URL` は Neon PostgreSQL の接続文字列です。スキーマ変更後は、対象環境を確認してから `npm run db:push` を実行します。
アプリ内AIは Vercel AI Gateway 経由で Claude / GPT / Gemini を切り替えます。Production では Vercel OIDC または `AI_GATEWAY_API_KEY` を使い、モデル差し替えは `AI_MODEL_CLAUDE`、`AI_MODEL_GPT`、`AI_MODEL_GEMINI` で行います。`GEMINI_API_KEY` / `GEMINI_MODEL` は Geminiモードの legacy fallback 用で任意です。

## Google OAuth

ローカル:

```text
Authorized JavaScript origins:
http://localhost:3000

Authorized redirect URIs:
http://localhost:3000/api/auth/callback/google
```

本番:

```text
Authorized JavaScript origins:
https://markdown-memory.vercel.app

Authorized redirect URIs:
https://markdown-memory.vercel.app/api/auth/callback/google
```

`401: deleted_client` が出る場合は、Google Cloud Console で新しい OAuth 2.0 Client ID を作り、Vercel の `AUTH_GOOGLE_ID` と `AUTH_GOOGLE_SECRET` を置き換えて Production を redeploy します。古い Client Secret は使い回しません。

## Phase 記録

Season 1 は Phase 10A で終わりではなく、Web/PWA完成と iOS TestFlight 内部配布までを含みます。Season 1.5 は作らず、TestFlight は Season 1 の Phase 15〜16 に置きます。

| Phase | Season   | 状態     | 内容                                                         |
| ----- | -------- | -------- | ------------------------------------------------------------ |
| 1-10A | Season 1 | 完了済み | Web/PWAのMVP、保存、共有、AI、PWA品質、Production確認        |
| 11    | Season 1 | 完了     | Season 1ゴール再定義、Roadmap/docs更新                       |
| 12    | Season 1 | 完了     | Privacy / Terms / アカウント削除 / データ削除導線            |
| 13    | Season 1 | 完了     | Web/PWA最終品質、Apple Safari実機、Production smoke          |
| 14    | Season 1 | 完了     | README中心のポートフォリオ仕上げ                             |
| 15    | Season 1 | 未着手   | iOS TestFlight用の最小ネイティブshell検証                    |
| 16    | Season 1 | 未着手   | TestFlight内部配布、実機確認、Season 1完了記録               |
| 17+   | Season 2 | 後続     | App Store審査対策、iOS固有価値追加、App Store本番公開、Mac化 |

Phase 6 の作業記録は [#23](https://github.com/ViNi-77/Markdown-Memory/issues/23) にあります。Phase 7 は Apple Safari を対象にし、Android Chrome は現時点の確認対象に含めません。Phase 8 以降は [`PRODUCTION_SMOKE_CHECK.md`](PRODUCTION_SMOKE_CHECK.md) に沿って、PWA実機確認とは分けて Production のログイン後導線とAI UXを確認します。Season 1 の完了条件は [`SEASON1_ROADMAP.md`](SEASON1_ROADMAP.md) を正とします。

Phase 12 では `/privacy`、`/terms`、ログイン後のアカウント設定、アカウント削除Server Actionを追加します。Apple公式の [Offering account deletion in your app](https://developer.apple.com/support/offering-account-deletion-in-your-app/) は、App Storeに提出するアプリがアカウント作成をサポートする場合、アプリ内でアカウント削除を開始できる必要があると説明しています。Season 1ではTestFlightまでですが、Phase 12でこの導線を前倒しで用意します。

Phase 13 では [`SEASON1_PHASE13_CHECK.md`](SEASON1_PHASE13_CHECK.md) と [`PRODUCTION_SMOKE_CHECK.md`](PRODUCTION_SMOKE_CHECK.md) を使い、Preview、CI、Production軽量確認、Apple Safari実機確認の境界を分けて記録します。2026-06-20 時点で、CI、Preview、Production軽量確認、iOS PWA metaのProduction反映、Apple Safari実機確認は完了しています。

Phase 14 では README をポートフォリオの入口として仕上げます。2026-06-20 時点で、Production、Demo、スクリーンショット、見どころ、技術構成、確認済み品質、Season 1 Roadmap がREADMEから追える状態です。詳細は [`SEASON1_PHASE14_CHECK.md`](SEASON1_PHASE14_CHECK.md) を参照します。

## 本番確認済み

2026-06-19 時点で、Production 環境で以下を確認済みです。対象は desktop と Apple Safari です。Android Chrome は引き続き確認対象外です。

- Google ログイン
- Markdown ファイル作成
- Markdown 本文の編集と保存
- ページ再読み込み後の保存内容復元
- フォルダ作成、ファイル移動、ファイル名変更
- 公開リンク作成
- 共有 URL の未ログイン閲覧
- 共有解除
- ペイン幅調整
- ブラウザ幅縮小時の本文ツールバー折り返し
- 全画面表示
- 外部AI連携（Claude / ChatGPT / Gemini）
- アプリ内AIの Claude / GPT / Gemini モード切替
- Provider別 APIキーの保存・削除、未設定/無効キー案内
- アプリ内AIのキー保存状態、空本文案内、AI提案の追記・置き換え確認
- アプリ内AIの一時履歴、前の提案への復元、履歴クリア
- `/api/health`
- `/api/cron/health` の `CRON_SECRET` 保護
- Vercel Runtime Logs の想定外500なし
- PWA manifest / PNG icon / offline page
- iOS PWA向け `apple-mobile-web-app-capable` meta

## 公開リポジトリの確認

Issue、PR、README、docs、スクリーンショットには以下を含めません。

- `.env.local`
- `.vercel`
- 実値入りの API キー、OAuth Secret、DB 接続 URL
- DB バックアップファイル
- 非公開 Markdown 本文
- ユーザーのメールアドレスや個人情報
- ローカルの作業ログや agent 用メタデータ

Production スモークでは、公開されても困らないテスト用 Markdown だけを作ります。確認後はテスト用ファイルを削除し、共有リンクを作った場合は共有を解除します。
