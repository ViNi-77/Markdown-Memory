# Neon バックアップ / 復元ドリル

Markdown Memory の本番データは Neon PostgreSQL に保存されます。バックアップは Neon の復元機能を主軸にし、節目の前後で手動 `pg_dump` を取れるようにします。

## 前提

ローカルに PostgreSQL client tools が必要です。

```bash
pg_dump --version
pg_restore --version
```

バックアップファイルは `backups/` に出力します。このディレクトリは `.gitignore` で除外しています。

## バックアップ

`.env.local` またはシェル環境に `DATABASE_URL` を設定してから実行します。

```bash
npm run db:backup
```

出力例:

```text
backups/markdown-memory-2026-06-13T00-00-00-000Z.dump
```

DB接続URLは `pg_dump` のコマンド引数に出さず、環境変数に分解して渡します。

## 復元ドリル

本番DBへ直接復元しないでください。必ず検証用の Neon DB を作り、その接続文字列を `RESTORE_DATABASE_URL` に設定します。

まず復元前チェックだけ実行します。

```bash
BACKUP_FILE=backups/markdown-memory-YYYY-MM-DD.dump npm run db:restore:check
```

実際に検証用DBへ復元する場合だけ `RUN_RESTORE=1` を付けます。

```bash
BACKUP_FILE=backups/markdown-memory-YYYY-MM-DD.dump npm run db:restore
```

復元後は、検証用環境で以下を確認します。

- ログインできる
- ファイル一覧が読める
- Markdown 本文が読める
- 共有リンクの公開状態が想定通り

## 運用メモ

- 本番反映前後、DBスキーマ変更前後、重要なデータ投入前後に取得する
- 月1回、検証用DBで復元ドリルを行う
- バックアップファイルをGitに入れない
- バックアップファイルを共有するときはアクセス制限された場所だけを使う
- 復元練習は最低でも大きめのリリース前に行う
- 復元ドリルの記録には、DB接続URL、ユーザー情報、Markdown本文を書かない

## Cron監視との関係

`/api/cron/health` は、DB接続文字列などの必須設定が本番に入っているかを毎日確認します。ただし、これはバックアップそのものではありません。

バックアップの実体は以下の2つで管理します。

- Neon ダッシュボード側の復元機能
- `npm run db:backup` で取得した手動ダンプ

Cronで異常を検知した場合は、まず Vercel Runtime Logs と Neon Dashboard を確認し、必要であれば直近バックアップから検証用DBへ復元できるか確認します。
