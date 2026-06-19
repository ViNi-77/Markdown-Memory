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

| 項目        | 確認内容                                             | 結果   |
| ----------- | ---------------------------------------------------- | ------ |
| Demo        | `/demo` が開き、作成・編集・プレビューができる       | 未実施 |
| Privacy     | `/privacy` が開き、保存データと削除方針を読める      | 未実施 |
| Terms       | `/terms` が開き、共有リンクとAI利用の注意を読める    | 未実施 |
| Account     | ログイン後のアカウント設定が開ける                   | 未実施 |
| AI key      | ブラウザ保存のProvider APIキー削除導線がある         | 未実施 |
| Delete      | アカウント削除が確認ダイアログ付きで実行される       | 未実施 |
| Mobile demo | 430px幅で一覧、本文、詳細、アカウントSheetを確認する | 未実施 |

## Production 軽量確認

merge後に以下を確認します。

```text
https://markdown-memory.vercel.app/api/health
https://markdown-memory.vercel.app/demo
https://markdown-memory.vercel.app/privacy
https://markdown-memory.vercel.app/terms
```

Runtime Logs では直近の想定外500、AIキー、DB接続URL、Markdown本文全文の露出がないことを確認します。

## Apple Safari 実機確認

実機確認は Apple 端末に限定します。Android Chrome は引き続き確認対象外です。

対象:

```text
https://markdown-memory.vercel.app
https://markdown-memory.vercel.app/demo
https://markdown-memory.vercel.app/offline
```

確認:

- [ ] Safari で `/demo` が開く
- [ ] 共有メニューからホーム画面に追加できる
- [ ] ホーム画面アイコンからアプリ表示で開ける
- [ ] ログイン後ワークスペースが開く
- [ ] 既存ファイルを読める
- [ ] Markdown本文を編集・保存できる
- [ ] 共有リンクを作成・解除できる
- [ ] アプリ内AIパネルを開ける
- [ ] アカウント設定から Privacy / Terms を開ける
- [ ] アカウント設定で危険操作が確認ダイアログ付きになっている
- [ ] オフライン時に `/offline` の案内が出る
- [ ] 非公開Markdown本文、APIキー、個人情報をスクリーンショットやIssueに残していない

## 記録テンプレート

```text
対象: Preview / Production
URL:
確認日:
確認者:

CI:
Preview:
Production:
Apple Safari:

判定:
- OK / 修正が必要 / 実機確認待ち

保留:

メモ:
```
