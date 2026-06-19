# Markdown Memory メンテナ向けメモ

この文書は、公開リポジトリの README に載せすぎない運用・確認手順への入口です。README は初見ユーザーがアプリの目的、機能、ローカル起動を把握するための場所として保ちます。

## 運用ドキュメント

| ドキュメント                                               | 用途                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| [`OPERATIONS.md`](OPERATIONS.md)                           | CI/CD、Vercel、監視、Issue運用、公開リポジトリの注意 |
| [`BRANCH_PROTECTION.md`](BRANCH_PROTECTION.md)             | main ブランチ保護の推奨設定                          |
| [`BACKUP_RESTORE.md`](BACKUP_RESTORE.md)                   | Neon バックアップと復元ドリル                        |
| [`PRODUCTION_SMOKE_CHECK.md`](PRODUCTION_SMOKE_CHECK.md)   | Production のログイン後保存、共有、AI、運用確認      |
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

| Phase | 状態              | 内容                                                              |
| ----- | ----------------- | ----------------------------------------------------------------- |
| 4     | 完了              | 公開MVP。ログイン、保存、共有、AI連携まで確認済み                 |
| 5     | 完了              | CI/CD、E2E、監視、バックアップ手順、フィードバック導線            |
| 5.5   | 完了              | Cron監視、PWA下地、スマホ前段導線、README整備                     |
| 6     | 完了              | スマホ閲覧最適化、PWA安全仕様、フィードバック運用整備             |
| 7     | 完了（Apple対象） | PWA品質強化、スマホ読書体験の磨き込み、アプリ化準備               |
| 8     | 完了              | Production保存・共有、AI provider切替、運用確認、レスポンシブ修正 |
| 9     | 完了              | AI設定UX、結果適用確認、エラー表示、秘密情報非露出の固定          |
| 10    | 完了              | AI提案の一時履歴、復元・クリア、永続保存なしの安全な再利用導線    |

Phase 6 の作業記録は [#23](https://github.com/ViNi-77/Markdown-Memory/issues/23) にあります。Phase 7 は Apple Safari を対象にし、Android Chrome は現時点の確認対象に含めません。Phase 8 以降は [`PRODUCTION_SMOKE_CHECK.md`](PRODUCTION_SMOKE_CHECK.md) に沿って、PWA実機確認とは分けて Production のログイン後導線とAI UXを確認します。

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
