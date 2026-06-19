# Security Policy

Markdown Memory は公開リポジトリとして運用しています。

## 秘密情報の扱い

以下はリポジトリに置きません。

- `.env.local`
- `.vercel`
- APIキー
- OAuth Client Secret
- DB接続URL
- DBバックアップ

`.env.example` には変数名だけを置き、実値は Vercel Environment Variables またはローカルの `.env.local` に設定します。

## 脆弱性や秘密情報を見つけた場合

公開Issueに APIキー、DB接続URL、個人情報、非公開Markdown本文を貼らないでください。

報告時は、再現手順と影響範囲だけを書き、秘密情報そのものは共有しないでください。GitHub の Security Advisory を使える場合は、公開Issueではなく Security Advisory で報告してください。

## 現在の保護方針

- GitHub Actions で lint / test / build / format / E2E を実行
- production dependencies は high 以上の `npm audit` を CI で検知
- Vercel Runtime Logs に Markdown 本文やAPIキーを出さない
- 任意の外部エラー通知でも Markdown 本文、APIキー、DB接続URL、stack trace を送らない
- 共有リンクは、明示的に公開したファイルだけ閲覧可能
- アカウント削除でAuth.js連携、Markdown本文、フォルダ、共有リンクを削除する
- Provider APIキーはDBに保存せず、ブラウザ保存分はアカウント設定から削除できる
- `backups/` は `.gitignore` で除外
