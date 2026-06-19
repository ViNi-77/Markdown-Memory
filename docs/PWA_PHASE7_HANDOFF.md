# Phase 7 PWA リリース判定メモ

Phase 7I では、PWA とスマホ読書体験の実装済み範囲を整理し、実機確認へ渡す状態を固定します。

このメモは「実装としてどこまで本番反映済みか」と「Apple 端末の実機で何を確認する必要があるか」を分けるためのものです。

## 現在の判定

Markdown Memory は、オンライン前提のPWAとしてホーム画面追加、起動、スマホ閲覧、オフライン案内までを Apple 端末で確認済みです。

Android Chrome は現在のサポート/実機確認対象に含めません。今後対象に戻す場合は、別Issueで端末方針と確認項目を再定義します。

## 実装済み

| 区分             | 内容                                                                |
| ---------------- | ------------------------------------------------------------------- |
| PWA 起動         | `manifest.webmanifest`、起動先 `/`、ショートカット、PNG/SVGアイコン |
| iOS 対応         | Apple touch icon と metadata                                        |
| オフライン案内   | `/offline` と Service Worker の navigation fallback                 |
| 安全なキャッシュ | `/demo`、`/offline`、PWAアイコン、静的アセットだけをキャッシュ      |
| キャッシュ除外   | `/`、`/login`、`/api/*`、`/share/*`、`/view/*`、非公開Markdown本文  |
| スマホ読書面     | 下部ナビ、現在地表示、本文への復帰導線、戻る導線                    |
| Markdown 表示    | 長いURL、表、コードブロックが本文ペイン全体を横に押し出さない       |
| データ方針       | ログイン後データ、共有ページ、API応答を端末へ永続保存しない         |

## 自動確認で固定していること

CI と Playwright E2E で、以下を確認します。

- `/demo` の作成、編集、プレビューが動く
- スマホ幅で一覧、本文、詳細を往復できる
- 下部ナビで現在地が分かる
- manifest に PNG / maskable / Apple touch icon が含まれる
- Service Worker 制御下のナビゲーション失敗時に `/offline` を表示する
- Service Worker cache に private / dynamic path を入れない
- 長いURL、表、コードブロックがスマホ幅の本文ペイン全体を横に押し出さない

## 実機確認の入口

実機では [`docs/PWA_REAL_DEVICE_CHECK.md`](PWA_REAL_DEVICE_CHECK.md) に沿って、Production の `/demo` を先に確認します。

```text
https://markdown-memory.vercel.app/demo
```

結果は GitHub Issue Template の「PWA 実機確認」に記録します。

Apple Safari で以下が揃えば、Phase 7 の実機確認完了として扱います。

- ホーム画面追加: OK または修正Issueが作成済み
- standalone 起動: OK または修正Issueが作成済み
- 実機オフライン時の `/offline` 導線: OK または修正Issueが作成済み

## 実機で問題が出た場合

実機確認で問題が出た場合は、以下の順で扱います。

1. GitHub Issue に端末、OS、ブラウザ、URL、再現手順を記録する
2. APIキー、個人情報、非公開Markdown本文が写るスクリーンショットは貼らない
3. `codex/phase7-real-device-fix-*` のような小さな修正ブランチを切る
4. 修正PRで E2E と該当する実機観点を更新する
5. Production 反映後に同じIssueへ再確認結果を追記する

## ここでは採用しないこと

Phase 7I 時点では、以下を採用しません。

- 非公開Markdown本文のオフライン閲覧
- オフライン編集
- 共有ページの端末自動保存
- Service Worker によるログイン後ワークスペースのキャッシュ
- App Store本番公開やMacアプリ化の判断

TestFlight は Season 1 の Phase 15〜16 で扱います。App Store本番公開、App Store審査対策としてのiOS固有価値追加、Macアプリ化は Season 2 以降で扱います。詳細は [`docs/SEASON1_ROADMAP.md`](SEASON1_ROADMAP.md) を参照します。

オフライン閲覧/編集を検討する場合は、先に [`docs/PWA_OFFLINE_DATA_POLICY.md`](PWA_OFFLINE_DATA_POLICY.md) の条件を満たします。

## 次の進め方

Apple Safari の実機確認がOKなら、Phase 7は「実装完了・Apple実機確認済み」として閉じられます。

実機確認で修正が必要なら、Phase 7の追加修正として扱います。

Apple Safari の実機確認がまだの場合でも、コード上の次フェーズへ進むことはできます。その場合、PWAは「実装完了・Apple実機確認待ち」として扱い、オフライン閲覧/編集や強いインストール訴求は入れません。
