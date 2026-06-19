# Phase 13 Web/PWA Final Quality Check

Phase 13 は、Season 1 後半の TestFlight 検証へ進む前に、Web/PWAとしての基礎品質をもう一度固めるフェーズです。

Phase 13 の対象は Web/PWA です。iOS TestFlight shell の実装は Phase 15、TestFlight 内部配布は Phase 16 で扱います。

## 完了条件

- Preview で `/demo`、`/privacy`、`/terms` が表示できる
- ログイン後アカウント設定から Privacy / Terms / AIキー削除 / アカウント削除導線へ進める
- アカウント削除は確認ダイアログを挟み、下部ナビなど誤タップしやすい場所に直接置かれていない
- `npm run format:check`、`npm run lint`、`npm run test`、`npm run build`、`npm run test:e2e` が通る
- Production merge後に `/api/health`、`/demo`、Runtime Logsを確認する
- Apple Safari 実機でホーム画面追加、ログイン後導線、保存、共有、AI、オフライン案内を確認する

## Preview 確認

| 項目        | 確認内容                                             | 結果         |
| ----------- | ---------------------------------------------------- | ------------ |
| Demo        | `/demo` が開き、作成・編集・プレビューができる       | OK           |
| Privacy     | `/privacy` が開き、保存データと削除方針を読める      | OK           |
| Terms       | `/terms` が開き、共有リンクとAI利用の注意を読める    | OK           |
| Account     | ログイン後のアカウント設定が開ける                   | 自動確認済み |
| AI key      | ブラウザ保存のProvider APIキー削除導線がある         | 自動確認済み |
| Delete      | アカウント削除が確認ダイアログ付きで実行される       | 自動確認済み |
| Mobile demo | 430px幅で一覧、本文、詳細、アカウントSheetを確認する | OK           |

記録:

- 2026-06-20: PR #66 Preview `dpl_5f2UD76dSC8Qrk1akg1ChPGT7RdH` で `/demo`、`/privacy`、`/terms`、`/api/health` を確認。
- 2026-06-20: PR #66 CIで `npm run format:check`、`npm run lint`、`npm run test`、`npm run build`、`npm run test:e2e` が成功。
- 2026-06-20: PR #67 Preview `dpl_2iKMZMcxvLr8aNnCD9QLFzCPZRuG` で `apple-mobile-web-app-capable=yes`、`mobile-web-app-capable=yes`、Apple touch icon を確認。

## Production 軽量確認

merge後に以下を確認します。

```text
https://markdown-memory.vercel.app/api/health
https://markdown-memory.vercel.app/demo
https://markdown-memory.vercel.app/privacy
https://markdown-memory.vercel.app/terms
```

Runtime Logs では直近の想定外500、AIキー、DB接続URL、Markdown本文全文の露出がないことを確認します。

記録:

- 2026-06-20: PR #66 merge後、Production deployment `dpl_FaKJS4tWjxdPdPUpV8z1maEQUTiz` が `7f49513` で READY。
- 2026-06-20: PR #67 merge後、Production deployment `dpl_ArRyWk6kng3YiPFvuefbQo3JqiLS` が `332ff8e` で READY。
- 2026-06-20: Production で `/api/health`、`/demo`、`/privacy`、`/terms` が 200、`/api/cron/health` が未認証で 401。
- 2026-06-20: Production HTMLで `apple-mobile-web-app-capable=yes`、`mobile-web-app-capable=yes`、Apple touch icon を確認。
- 2026-06-20: Vercel Runtime Logs の直近30分で error/fatal、500、APIキー/Secret/DB URL/Markdown本文の露出検索に該当なし。

## Apple Safari 実機確認

実機確認は Apple 端末に限定します。Android Chrome は引き続き確認対象外です。

状態: 完了。2026-06-20 に Apple Safari 実機確認済み。

対象:

```text
https://markdown-memory.vercel.app
https://markdown-memory.vercel.app/demo
https://markdown-memory.vercel.app/offline
```

確認:

- [x] Safari で `/demo` が開く
- [x] 共有メニューからホーム画面に追加できる
- [x] ホーム画面アイコンからアプリ表示で開ける
- [x] ログイン後ワークスペースが開く
- [x] 既存ファイルを読める
- [x] Markdown本文を編集・保存できる
- [x] 共有リンクを作成・解除できる
- [x] アプリ内AIパネルを開ける
- [x] アカウント設定から Privacy / Terms を開ける
- [x] アカウント設定で危険操作が確認ダイアログ付きになっている
- [x] オフライン時に `/offline` の案内が出る
- [x] 非公開Markdown本文、APIキー、個人情報をスクリーンショットやIssueに残していない

記録:

- 2026-06-20: ユーザーにより Apple Safari 実機確認済み。

## 記録テンプレート

```text
対象: Preview / Production
URL:
確認日:
確認者:

CI:
Preview:
Production:
Apple Safari: OK

判定:
- OK

保留:

メモ:
```
