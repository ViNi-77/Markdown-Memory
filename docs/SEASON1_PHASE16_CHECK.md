# Season 1 Phase 16 Check

Phase 16 は、Season 1 の最終フェーズです。ゴールは、Markdown Memory の最小iOS shellを TestFlight の内部配布へ載せ、iPhone実機でProduction Web/PWAの主要導線を確認し、Season 1完了を記録することです。

App Store本番公開、外部TestFlight配布、App Store審査対策としてのiOS固有価値追加、Macアプリ化は Season 2 以降で扱います。

## 前提

- Apple Developer Program は加入済み
- Xcode本体はユーザー環境で利用可能
- Bundle ID は `com.vini.markdownmemory` を使う
- App名は `Markdown Memory`
- 初回TestFlight候補は version `1.0.0` / build `1`
- iOS shellは引き続き `SFSafariViewController` で `https://markdown-memory.vercel.app` を開く
- アプリDB、Auth、保存、共有、AI API、Production URLは変更しない

## 役割分担

### Codex担当

- Phase 16の公開手順とチェックリストをdocsへ反映する
- iOS shellのDebug build、Release build、Simulator起動確認をGitHub Actionsで維持する
- TestFlight upload前に必要なリポジトリ側の最小修正があればPR化する
- TestFlight確認OK後、README、Roadmap、Maintainers、Phase 16記録をSeason 1完了へ更新する

### ユーザー担当

- Apple Developer Programへ加入する
- App Store ConnectでApp Store Connect app recordを作成する
- Bundle ID `com.vini.markdownmemory` を登録する
- Xcode本体をインストールし、XcodeのTeamを選択する
- XcodeでArchiveし、App Store Connectへuploadする
- TestFlightの内部テスターとして自分を追加し、iPhone実機で確認する
- 実機確認結果をこのスレッドへ返す

## Phase 16A: 準備PR

Codexが、Phase 16の進行中化、TestFlight手順、リポジトリ側の確認導線を追加します。

- [x] README / Roadmap / MaintainersでPhase 16を進行中へ更新する
- [x] Phase 16チェック文書を追加する
- [x] iOS Shell workflowにRelease build確認を追加する
- [x] `npm run format:check`
- [x] `npm run lint`
- [x] PR CI green
- [x] PR iOS Shell workflow green
- [x] Vercel Preview READY
- [x] main merge後にProduction `/api/health` と `/demo` を確認する

2026-06-21 にPR #77で完了しました。main commit `598136cb4de942abbc27786dead209ddb1a46a9f` で、CI、iOS Shell workflow、Vercel Production deployment、Production `/api/health`、Production `/demo` の確認が完了しています。

## Phase 16B: Apple / Xcode準備

ユーザーがApple側の準備を行います。実値は公開リポジトリには記録しません。

- [x] Apple Accountの2ファクタ認証を有効にする
- [x] Apple Developer Programへ加入する
- [x] App Store Connectで必要な契約/規約が未同意なら同意する
- [x] App Store Connectで新規アプリを作成する
- [x] Bundle ID `com.vini.markdownmemory` を登録する
- [x] Xcode本体をインストールする
- [x] `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` を実行する
- [x] `scripts/check-ios-testflight-prereqs.sh` が必須項目PASSになる
- [x] Xcodeで `ios/MarkdownMemory/MarkdownMemory.xcodeproj` を開く
- [x] Signing & CapabilitiesでTeamを選択する

Apple側の入力メモ:

| 場所                                 | 入力/選択                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Apple Developer Program              | 個人または組織で加入する。個人情報、決済情報、Team IDなどは公開リポジトリへ記録しない        |
| Certificates, Identifiers & Profiles | Explicit App IDを作成し、Bundle IDは `com.vini.markdownmemory` にする                        |
| App Store Connect app record         | Platformは `iOS`、App nameは `Markdown Memory`、Bundle IDは `com.vini.markdownmemory` を選ぶ |
| App Store Connect SKU                | 例: `markdown-memory-ios`。内部管理用で、同じアカウント内では再利用できない前提で決める      |
| Primary language                     | UIに合わせて `Japanese` を優先。必要なら英語メタデータはSeason 2で追加する                   |
| Category                             | `Productivity`                                                                               |
| Privacy Policy URL                   | `https://markdown-memory.vercel.app/privacy`                                                 |
| Support URL                          | `https://markdown-memory.vercel.app`                                                         |

TestFlight内部配布の入力メモ:

| 場所                   | 入力/選択                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Internal Testing group | 例: `Season 1 Internal`                                                                                   |
| What to Test           | `Login, markdown save/restore, sharing, AI panel, provider switching, and production web shell behavior.` |
| Feedback email         | Apple Developer Programで管理できるメールアドレス。公開リポジトリへ記録しない                             |

2026-06-25 時点で、Xcode 26.5 が利用可能で、`scripts/check-ios-testflight-prereqs.sh` はPhase 16Bのローカル前提チェックをPASSしています。Apple Distribution signing identity も利用可能です。

同日、アプリ登録とXcode signing設定も完了し、Phase 16CのArchive / Uploadへ進める状態になりました。

参考:

- [Apple Developer Program enrollment](https://developer.apple.com/help/account/membership/program-enrollment/)
- [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)

## Phase 16C: Archive / Upload

ユーザーがXcodeからApp Store Connectへbuildをuploadします。

- [x] XcodeでGeneric iOS Deviceまたは接続したiPhoneを選ぶ
- [x] Product > Archive を実行する
- [x] Archive OrganizerでDistribute Appを選ぶ
- [x] App Store Connect uploadを選ぶ
- [x] upload完了後、App Store ConnectのTestFlightタブでprocessing完了を待つ
- [x] buildがTestFlightで選択可能になっていることを確認する

2026-06-25 に version `1.0.0` / build `1` をApp Store Connectへuploadしました。初回uploadではApp Iconと `CFBundleIconName` の不足を修正し、その後のArchive uploadが成功しました。

参考:

- [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)

## Phase 16D: TestFlight内部配布と実機スモーク

Season 1では内部配布だけを対象にします。外部テスター配布はSeason 2以降です。

- [x] 内部テスターグループを作成する
- [x] 自分を内部テスターに追加する
- [x] buildを内部テスターへ配布する
- [x] iPhoneでTestFlightアプリからMarkdown Memoryをインストールする
- [x] 起動後にProduction URLが開く
- [x] Googleログインできる
- [x] Markdown作成、編集、保存、リロード後復元ができる
- [x] 共有リンク作成、未ログイン閲覧、共有解除ができる
- [x] アプリ内AIパネル表示とProvider切替ができる
- [x] 外部AI導線が開ける
- [x] 戻る/閉じる導線、Safe Area、横幅、文字崩れに重大な問題がない
- [x] Web/PWA版と比べて重大な劣化がない

2026-06-25 に TestFlight build `1.0.0 (1)` のiPhone実機確認が完了しました。追加で気になった「一覧 / 本文 / 詳細」下部ナビの切替表示は PR #91 で修正し、main merge、CI、Vercel Production反映、`/api/health`、`/demo` まで確認済みです。

参考:

- [Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)

## Phase 16E: Season 1完了記録

TestFlight実機確認が完了したら、CodexがSeason 1完了PRを作成します。

- [x] READMEの現在地をSeason 1完了へ更新する
- [x] RoadmapでPhase 16を完了へ更新する
- [x] MaintainersにTestFlight確認日と範囲を記録する
- [x] この文書にTestFlight build、確認日、確認範囲を記録する
- [x] Season 2開始候補としてApp Store審査対策、iOS固有価値追加、Mac化を整理する

## 現在の状態

2026-06-25 時点で、Season 1 / Phase 16 は完了です。Web/PWAのProduction品質、Privacy / Terms / アカウント削除、READMEポートフォリオ整理、iOS shell、TestFlight内部配布、iPhone実機確認まで到達しました。App Store本番公開、外部TestFlight、App Store審査対策としてのiOS固有価値追加、Macアプリ化はSeason 2以降で扱います。
