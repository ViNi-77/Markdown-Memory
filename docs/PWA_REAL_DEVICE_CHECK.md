# PWA 実機確認チェックリスト

Markdown Memory をスマホのホーム画面に追加して使う前に、Preview または Production で実機確認します。

この確認は、非公開Markdown本文を端末へ残さない現在方針を守りながら、PWAとしての見え方とオフライン時の案内が自然かを見るためのものです。

Phase 7の実装済み範囲と実機確認待ちの扱いは [`docs/PWA_PHASE7_HANDOFF.md`](PWA_PHASE7_HANDOFF.md) にまとめています。

## 確認対象

| 項目       | 対象                                                                |
| ---------- | ------------------------------------------------------------------- |
| Production | `https://markdown-memory.vercel.app`                                |
| Demo       | `https://markdown-memory.vercel.app/demo`                           |
| Offline    | `https://markdown-memory.vercel.app/offline`                        |
| Preview    | PRごとの Vercel Preview URL。実機確認が必要な変更だけ対象にします。 |

実機では、まず未ログインでも使える `/demo` を確認します。ログイン後の本番ワークスペース確認は、DB保存・OAuth・共有URLを含むため、別タスクとして扱います。

## 事前準備

- 同じ端末に古い Markdown Memory のホーム画面アイコンがある場合は、削除してから確認する
- Private Browsing / Secret mode ではなく、通常のブラウザで確認する
- `/demo` を一度オンラインで開き、Service Worker とアプリシェルを取得させる
- スクリーンショットを残す場合、APIキー、個人情報、非公開Markdown本文が写らない画面だけにする
- 実機結果は GitHub Issue の「PWA 実機確認」または「モバイル / PWA フィードバック」に記録する

## 対象端末

PWA 実機確認の対象は Apple 端末に限定します。Android Chrome は現在のサポート/確認対象に含めません。

## Apple Safari

対象URL:

```text
https://markdown-memory.vercel.app/demo
```

確認:

- [ ] iPhone または iPad の Safari で `/demo` が開き、ファイル一覧・本文・詳細を下部ナビで往復できる
- [ ] 共有メニューから「ホーム画面に追加」を選べる
- [ ] 追加画面でアプリ名が `Markdown Memory` として自然に見える
- [ ] ホーム画面のアイコンが空白、黒塗り、極端な切れ方になっていない
- [ ] ホーム画面アイコンから起動すると、Safari の通常ツールバーではなくアプリ表示として開く
- [ ] 起動先 `/` で、未ログイン時はログイン画面または既存のログイン導線へ進む
- [ ] オンラインで `/demo` を一度開いたあと、機内モードで再読み込みまたは再起動すると `/offline` の案内が表示される
- [ ] `/offline` に「ワークスペースを開く」と「デモを開く」の導線がある
- [ ] `/offline` から Privacy / Terms を開ける
- [ ] `/offline` に非公開Markdown本文が表示されない
- [ ] オンラインへ戻したあと、`/demo` が再表示できる

## Season 1 Phase 13 追加確認

ログイン後の本番ワークスペースまで確認できる場合は、以下も見ます。アカウント削除の最終実行は、Production用テストアカウントでだけ行います。

2026-06-20 時点で、Production HTMLのPWA meta、manifest、Apple touch icon、公開ページ、Runtime Logsは自動確認済みです。残りはこの節のApple Safari実機確認です。

- [ ] アカウントSheetまたはアカウント設定を開ける
- [ ] Privacy / Terms を開ける
- [ ] Provider APIキー削除導線が表示される
- [ ] アカウント削除は確認ダイアログ付きで表示される
- [ ] 下部ナビにアカウント削除の直接ボタンがない

## 結果の書き方

```text
対象: Production / Preview
URL:
端末:
OS:
ブラウザ:
確認日:

ホーム画面追加:
- アプリ名:
- アイコン:
- 起動先:

オフライン:
- /offline 表示:
- 復帰導線:
- 非公開Markdown本文が表示されない:

判定:
- OK / 修正が必要

メモ:
```

## OK の基準

- Apple Safari で、`/demo` の閲覧導線が壊れていない
- ホーム画面追加時の名前とアイコンが自然に見える
- 起動先 `/` が既存のログイン導線またはワークスペースへ進む
- オフライン時は `/offline` の案内へ落ち、非公開Markdown本文を表示しない
- オンライン復帰後に `/demo` へ戻れる
