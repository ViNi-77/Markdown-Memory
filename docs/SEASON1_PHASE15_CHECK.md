# Season 1 Phase 15 Check

Phase 15 は、Season 1 の最終盤で TestFlight 内部配布へ進む前の、iOS最小ネイティブshell検証です。

このPhaseでは App Store本番審査突破を狙いません。Production Web/PWAをiOSアプリとして開き、ログイン、保存、共有、AI導線に重大な劣化がないかを確認するための土台を用意します。

## 実装範囲

- `ios/MarkdownMemory/MarkdownMemory.xcodeproj` を追加
- SwiftUI ベースの最小アプリを追加
- Production URL `https://markdown-memory.vercel.app` を開く導線を追加
- App Icon は既存PWAアイコンを暫定V0として流用
- `PrivacyInfo.xcprivacy` を追加
- GitHub Actions の macOS runner でiOS shellのDebug buildを確認するワークフローを追加
- DB、認証、保存、共有、AI API のWeb実装は変更しない

## Web表示方式

Phase 15 のiOS shellは `WKWebView` ではなく `SFSafariViewController` でProductionを開きます。

Google は、OAuth認証リクエストを埋め込みWebViewで行うことをブロック対象にしており、`WKWebView` を含む埋め込みWebViewはGoogle OAuthの要件に合いません。Google公式の案内でも、アプリはOS既定の安全なブラウザ動作、Universal Links、または `SFSafariViewController` の利用へ移行するよう説明されています。

参照: [Upcoming security changes to Google's OAuth 2.0 authorization endpoint in embedded webviews](https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/)

## ローカル確認状況

2026-06-20 時点のこの作業環境では、Xcode本体が選択されていません。

```text
xcode-select -p
/Library/Developer/CommandLineTools
```

そのため、手元では以下は未完了です。

- `xcodebuild -list`
- iOS Simulator 起動
- iPhone 実機ビルド
- Archive 作成
- TestFlight upload

Swift toolchain は見えていますが、iOS app build にはXcode本体が必要です。

## GitHub Actionsでのbuild確認

手元にXcode本体がない環境でも、GitHub Actions の `iOS Shell` workflow で以下を確認します。

```bash
scripts/verify-ios-shell.sh
```

このスクリプトは、macOS runner上で以下を実行します。

- `xcodebuild -version`
- `xcodebuild -showsdks`
- `xcodebuild -list -project ios/MarkdownMemory/MarkdownMemory.xcodeproj`
- `xcodebuild -project ios/MarkdownMemory/MarkdownMemory.xcodeproj -scheme MarkdownMemory -configuration Debug -sdk iphonesimulator -destination "generic/platform=iOS Simulator" CODE_SIGNING_ALLOWED=NO clean build`

さらに `scripts/smoke-ios-shell-simulator.sh` で、build済みアプリをiPhone Simulatorへインストールし、起動後のスクリーンショットをartifactとして保存します。

この確認で証明できるのは、Xcode projectの構文、target認識、iOS Simulator向けDebug build、Simulatorでのアプリ起動です。Googleログイン、保存、共有、AIパネル表示は、SimulatorまたはiPhone実機での手動確認を完了条件として残します。

## 2026-06-20 自動確認結果

Phase 15 の自動確認は以下まで完了しています。

- PR #71: iOS shell project 追加
- PR #72: `iOS Shell` workflow と `scripts/verify-ios-shell.sh` 追加
- PR #73: Simulatorインストール、起動、スクリーンショットartifact保存を追加
- main CI: `27858054868` success
- main iOS Shell: `27858054865` success
- Vercel Production deployment: commit `63616191d02951f459dafcb25c3b67065221b7e7` で success
- Production `/api/health`: 200
- Production `/demo`: 200

`iOS Shell` workflow のartifact `ios-shell-simulator-screenshot` では、iPhone Simulator上の `SFSafariViewController` が `markdown-memory.vercel.app` を開き、ログイン画面を表示していることを確認済みです。

この時点で、Xcode project認識、Debug build、Simulator起動、Production表示、Safe Areaの大きな崩れなし、Googleログイン開始画面の表示までは自動証拠があります。

## 手動確認手順

Phase 15 を完了扱いにするには、iOS shell上でログイン後の主要導線を確認します。Xcodeをインストールまたは選択した環境では、以下で同じshellを起動できます。

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
scripts/verify-ios-shell.sh
```

Xcode上、またはGitHub ActionsのSimulator artifactで起動済みshellを確認したうえで、実機/Simulatorで以下を確認します。

1. `ios/MarkdownMemory/MarkdownMemory.xcodeproj` を開く
2. Team を選択する
3. Bundle Identifier が `com.vini.markdownmemory` でよいか確認する
4. iPhone Simulator または実機でRunする
5. 起動後にProductionが開くことを確認する
6. Googleログインを完了できることを確認する
7. Markdown作成、保存、リロード復元を確認する
8. 共有リンク作成、未ログイン閲覧、共有解除を確認する
9. アプリ内AIパネル表示とProvider切替を確認する
10. 外部リンク、戻る導線、Safe Areaに重大な崩れがないことを確認する

## Phase 15 完了条件

- Xcode project が開ける
- Debug build が通る
- Simulator またはiPhone実機でProductionが開ける
- Googleログイン、保存、共有、AIパネル表示が確認できる
- Web/PWA版と比べて重大な劣化がない
- Phase 16 のTestFlight内部配布へ進める判断ができる

## 残タスク

- iOS shell上でGoogleログインを完了する
- ログイン後にMarkdown作成、保存、リロード復元を確認する
- 共有リンク作成、未ログイン閲覧、共有解除を確認する
- アプリ内AIパネル表示とProvider切替を確認する
- 手動確認結果をこの文書とRoadmapへ反映し、Phase 15を完了に更新する
- Phase 16でApple Developer Team設定、Archive、App Store Connect登録、TestFlight uploadへ進む
