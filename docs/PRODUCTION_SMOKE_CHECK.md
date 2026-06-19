# Production スモークチェックリスト

Markdown Memory の Production 環境で、ログイン後ワークスペース、保存、共有、AI連携、運用ヘルスチェックが壊れていないことを小さく確認します。

Phase 8 では、PWA の `/demo` 実機確認とは分けて、OAuth、DB保存、共有URL、本番環境変数に触れる流れを確認対象にしました。

## 確認対象

| 項目       | 対象                                            |
| ---------- | ----------------------------------------------- |
| Production | `https://markdown-memory.vercel.app`            |
| Demo       | `https://markdown-memory.vercel.app/demo`       |
| Health     | `https://markdown-memory.vercel.app/api/health` |

確認は Production で行います。Preview で同じ流れを試す場合も、結果には対象URLを明記します。

## 実施結果（2026-06-19 / Phase 8B-8C）

対象: Production

URL: `https://markdown-memory.vercel.app`

確認者: Vini / Codex

端末/ブラウザ: desktop、Apple Safari

判定: OK

- PR #59 でアプリ内AIの Claude / GPT / Gemini provider切替、Provider別APIキー保存・削除、AI Gateway / Gemini fallback 導線を main へ反映済み。
- PR #60 でブラウザ幅縮小時に本文ツールバーと詳細ペインが重なって見える問題を修正済み。
- ユーザー確認により、Production のログイン後保存、共有、AI連携、Apple Safari の主要導線はOK。
- 2026-06-19 の軽量確認で `/api/health` は 200、`/demo` は 200、`/api/cron/health` は未認証で 401。
- PR #61 merge後の Vercel Production deployment `dpl_8oX2Bpm8wSRW3hUFs93vMuMjbGvw` は Ready。直近ログで想定外500、AIログのAPIキー/Markdown全文露出は確認されていません。

保留:

- Android Chrome はサポート/実機確認対象外。
- AI成功系は、有効なBYOKまたはAI Gateway設定が使える環境でのみ実施します。キー文字列や非公開本文は記録しません。

## Phase 12 / 13 追加確認

Phase 12 / 13 では、TestFlightへ進む前にPrivacy / Termsとデータ削除導線も確認します。

- [ ] `/privacy` が表示できる
- [ ] `/terms` が表示できる
- [ ] ログイン後のアカウント設定から Privacy / Terms を開ける
- [ ] アカウント設定でProvider APIキーのブラウザ保存と削除方針が分かる
- [ ] Provider APIキー削除ボタンで、このブラウザの保存キーを削除できる
- [ ] アカウント削除は確認ダイアログ付きで、誤タップしやすい下部ナビには直接置かれていない
- [ ] アカウント削除を実際に確認する場合は、Production用テストアカウントだけを使う
- [ ] 削除後、共有リンクや保存Markdownが残っていないことを確認する

注意: 普段使いのProductionアカウントでは、アカウント削除の最終実行は行いません。導線確認はダイアログ表示までに止め、完全削除はテストアカウントでだけ実施します。

## 事前準備

- 個人情報、APIキー、DB接続URL、非公開Markdown本文をスクリーンショットやIssueに残さない
- テスト用Markdownは公開されても困らない内容にする
- 共有リンクを作った場合は、確認後に非公開へ戻すか、テスト用ファイルを削除する
- BYOK の Provider API キーを使う場合、キー文字列そのものを記録しない
- Production DB に残してよいテストデータだけを作る

## デスクトップ確認

- [ ] Google ログインできる
- [ ] ワークスペースが開く
- [ ] 新規Markdownファイルを作成できる
- [ ] Markdown本文を編集して保存できる
- [ ] ページ再読み込み後も保存内容が復元される
- [ ] フォルダを作成できる
- [ ] ファイルをフォルダへ移動できる
- [ ] ファイル名を変更できる
- [ ] 全画面表示で本文を読める
- [ ] 公開共有リンクを作成できる
- [ ] 共有URLを未ログイン状態で閲覧できる
- [ ] 共有を解除すると、共有URLで本文を読めなくなる
- [ ] テスト用ファイルを削除できる

## AI連携確認

- [ ] Claude / ChatGPT / Gemini へ本文コピーまたは再投入導線を開ける
- [ ] アプリ内AIパネルを開閉できる
- [ ] Claude / GPT / Gemini モードを切り替えできる
- [ ] Provider別 APIキーを保存・削除できる
- [ ] 選択中Provider、キー保存状態、未保存変更が区別して表示される
- [ ] 空本文ではAI実行が止まり、本文やAPIキーを含まない案内が表示される
- [ ] APIキー未設定時またはGateway未設定時の案内が自然に表示される
- [ ] BYOK またはサーバー側キーがある環境では、要約または整形を1回実行できる
- [ ] AI提案をコピー、末尾に追記、本文置き換え確認から適用できる
- [ ] 複数回AIを実行した後、一時履歴から前の提案を復元・クリアできる
- [ ] 無効キーのエラー表示にAPIキーやMarkdown全文が露出しない
- [ ] AI API の Runtime Logs に provider/model/status は出るが、APIキーやMarkdown全文は露出しない

## モバイル確認

Phase 8 のモバイル確認はログイン後ワークスペースの実用導線だけを見ます。PWAのホーム画面追加とオフライン導線は [`docs/PWA_REAL_DEVICE_CHECK.md`](PWA_REAL_DEVICE_CHECK.md) で扱います。Android Chrome は現時点の確認対象に含めません。

- [ ] スマホ幅でログイン後ワークスペースを開ける
- [ ] ファイル一覧、本文、詳細を往復できる
- [ ] 既存ファイルの本文を読める
- [ ] 編集と保存ができる
- [ ] 詳細ペインから共有とAI連携の操作を開ける
- [ ] 下部ナビに危険操作が直接置かれていない
- [ ] アカウントSheetからPrivacy / Termsへ進める

## 運用確認

- [ ] `/api/health` が 200 を返す
- [ ] `/api/cron/health` は認証なしで詳細を返さない
- [ ] Vercel Runtime Logs に想定外の 500 エラーが出ていない
- [ ] Vercel Analytics / Speed Insights が本番プロジェクトに紐づいている
- [ ] 必要なら `npm run db:backup` の手順を確認する

## 結果の書き方

```text
対象: Production / Preview
URL:
確認日:
確認者:
端末/ブラウザ:

ログイン:
保存:
共有:
AI連携:
モバイル:
運用ヘルス:

判定:
- OK / 修正が必要 / 一部保留

保留:

メモ:
```

## OK の基準

- ログイン、保存、共有、本文閲覧の主要導線が Production で壊れていない
- 共有解除後に共有URLで本文を読めない
- AI連携で秘密情報が画面やログに露出していない
- スマホ幅でも既存ファイルを読み、編集と保存へ戻れる
- ヘルスチェックと本番ログに大きな異常がない

問題が出た場合は、端末、ブラウザ、URL、再現手順、期待した動き、実際の動きを Issue に残します。秘密情報や非公開Markdown本文は貼りません。
