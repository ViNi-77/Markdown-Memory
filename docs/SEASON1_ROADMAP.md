# Season 1 Roadmap

Season 1 は、Phase 10A までのWeb/PWA実装を含む現在のプロダクト進行全体です。Phase 10A は Season 1 の途中成果であり、Season 1 の完了ではありません。

Season 1 の最終ゴールは、Web/PWAとして完成度を高めたうえで、iOS TestFlight の内部配布まで到達することです。App Store本番公開、App Store審査対策としてのiOS固有価値追加、Macアプリ化は Season 2 以降で扱います。

## Season 1 の完了条件

- Production Web/PWA がポートフォリオとして見せられる完成度になっている
- Privacy / Terms / アカウント削除 / データ削除導線が用意されている
- README中心に、Demo、Production、技術構成、開発ストーリー、確認状況が分かる
- Apple Safari のホーム画面追加、ログイン後導線、保存、共有、AI、オフライン案内が確認済み
- iOS TestFlight の内部配布で、Production URLを使う最小iOS shellを実機確認できている

## Phase 配置

| Phase | Season   | 状態     | ゴール                                                             |
| ----- | -------- | -------- | ------------------------------------------------------------------ |
| 1-10A | Season 1 | 完了済み | Web/PWAのMVP、保存、共有、AI、PWA品質、Production確認              |
| 11    | Season 1 | 完了     | Season 1ゴール再定義、Roadmap/docs更新                             |
| 12    | Season 1 | 完了     | Privacy / Terms / アカウント削除 / データ削除導線                  |
| 13    | Season 1 | 完了     | Web/PWA最終品質、Apple Safari実機、Production smoke                |
| 14    | Season 1 | 完了     | README中心のポートフォリオ仕上げ                                   |
| 15    | Season 1 | 完了     | iOS shell追加、自動build/Simulator起動確認、ログイン後手動スモーク |
| 16    | Season 1 | 進行中   | TestFlight内部配布、実機確認、Season 1完了記録                     |
| 17+   | Season 2 | 後続     | App Store審査対策、iOS固有価値追加、App Store本番公開、Mac化       |

## Phase 15 / 16 のTestFlight方針

TestFlight は Season 1 の終盤に組み込みます。Season 1.5 は作りません。

Phase 15 では、App Store審査突破を狙わず、最小iOS shellの技術検証だけを行います。

- Xcode project を追加する
- Production URL を表示するiOS shellを作る
- Googleログイン、Safe Area、外部リンク、共有リンク、戻る導線を確認する
- Web版と比べて重大な劣化がないことを確認する

2026-06-20 に、`ios/MarkdownMemory/MarkdownMemory.xcodeproj` と SwiftUI ベースの最小shellを追加しました。Google OAuth互換性を優先し、Productionは埋め込み `WKWebView` ではなく `SFSafariViewController` で開きます。GitHub Actions の `iOS Shell` workflowで、Xcode project認識、iOS Simulator向けDebug build、Simulatorインストール、起動、Productionログイン画面のスクリーンショット保存まで確認済みです。同日、iOS shell上でのログイン後手動スモークも確認済みとなり、Phase 15は完了です。詳細は [`SEASON1_PHASE15_CHECK.md`](SEASON1_PHASE15_CHECK.md) に記録します。

Phase 16 では、Apple Developer Program加入後にTestFlight内部配布へ進みます。

- App Store Connect にアプリを登録する
- Bundle ID を作成する
- TestFlight 内部テスターへ配布する
- iPhone実機でログイン、保存、共有、AIパネル表示を確認する
- Season 1完了記録をREADME/docsへ反映する

2026-06-21 時点で Phase 16A は完了しています。リポジトリ側ではTestFlight手順、ユーザー/Codexの役割分担、Release build確認を整備済みです。次はPhase 16Bとして、Apple Developer Program加入、App Store Connect登録、Xcode本体の選択、Xcode Team設定をユーザー環境で進めます。詳細は [`SEASON1_PHASE16_CHECK.md`](SEASON1_PHASE16_CHECK.md) に記録します。

## Season 2 に送るもの

- App Store本番公開
- App Store審査対策としてのiOS固有価値追加
- 単なるWebView包装に見えないネイティブ体験の設計
- Mac App Store / Macアプリ化
- オフライン閲覧・編集
- 通知、バックグラウンド同期、iOSネイティブ共有拡張

## 確認コマンド

Web/PWA側では、通常の品質ゲートを維持します。

```bash
npm run format:check
npm run lint
npm run test
npm run build
npm run test:e2e
```

TestFlight側では、Xcode archive、App Store Connect upload、TestFlight内部配布、iPhone実機確認をPhase 16の完了条件にします。

## Phase 12 / 13 の進め方

Phase 12 では、TestFlightへ進む前に、Web/PWA側でユーザーが自分のデータの扱いを確認し、削除できる状態を用意します。

- `/privacy` と `/terms` を公開ルートとして用意する
- ログイン後のアカウント設定からPrivacy / Termsへ辿れる
- Provider APIキーはブラウザ保存であることを明示し、ブラウザ保存分だけを削除できる
- アカウント削除では、Auth.js連携、Markdown本文、フォルダ、共有リンクを削除する
- 削除操作は破壊的操作として確認ダイアログを挟む

Phase 13 では、Web/PWAがSeason 1後半の土台として壊れていないことを確認します。

- `npm run format:check`
- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:e2e`
- Vercel Preview の `/demo`、`/privacy`、`/terms`
- Production merge後の `/api/health`、`/demo`、Runtime Logs
- Apple Safari 実機でホーム画面追加、ログイン後導線、保存、共有、AI、オフライン案内

2026-06-20 時点で、Phase 12の実装とPhase 13の自動確認・Production軽量確認は完了しています。PR #66 で Privacy / Terms / アカウント削除導線を追加し、PR #67 で iOS PWA向けの `apple-mobile-web-app-capable` meta をProduction HTMLへ明示しました。

2026-06-20 に、Apple Safari実機でのホーム画面追加、ログイン後導線、保存、共有、AI、オフライン案内の確認が完了しました。これによりPhase 13は完了です。

## Phase 14 の完了記録

Phase 14 では、Season 1 のWeb/PWA成果をポートフォリオとして見せられるように README を仕上げます。

- Production、Demo、Repository、スクリーンショットへの入口をREADME冒頭で維持する
- 何を作ったプロダクトか、何を解決するかを Portfolio Snapshot として明示する
- 実用導線、AI UX、モバイル/PWA、公開運用、ポートフォリオ性を見どころとして整理する
- CI、E2E、Production smoke、Apple Safari実機、Runtime Logsの確認済み品質をREADMEから読めるようにする
- Phase 15 の iOS TestFlight用最小ネイティブshell検証へ進める状態にする

2026-06-20 に README 中心のポートフォリオ仕上げを完了しました。詳細は [`SEASON1_PHASE14_CHECK.md`](SEASON1_PHASE14_CHECK.md) に記録します。
