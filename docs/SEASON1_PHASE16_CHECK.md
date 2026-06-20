# Season 1 Phase 16 Check

Phase 16 は、Season 1 の最終フェーズです。ゴールは、Markdown Memory の最小iOS shellを TestFlight の内部配布へ載せ、iPhone実機でProduction Web/PWAの主要導線を確認し、Season 1完了を記録することです。

App Store本番公開、外部TestFlight配布、App Store審査対策としてのiOS固有価値追加、Macアプリ化は Season 2 以降で扱います。

## 前提

- Apple Developer Program はこれから加入する
- Xcode本体の利用可否はユーザー環境で確認する
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

- [ ] Apple Accountの2ファクタ認証を有効にする
- [ ] Apple Developer Programへ加入する
- [ ] App Store Connectで必要な契約/規約が未同意なら同意する
- [ ] App Store Connectで新規アプリを作成する
- [ ] Bundle ID `com.vini.markdownmemory` を登録する
- [ ] Xcode本体をインストールする
- [ ] `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` を実行する
- [ ] Xcodeで `ios/MarkdownMemory/MarkdownMemory.xcodeproj` を開く
- [ ] Signing & CapabilitiesでTeamを選択する

2026-06-21 時点のローカル確認では、Xcode本体ではなくCommand Line Toolsが選択されています。

```text
xcode-select -p
/Library/Developer/CommandLineTools
```

Xcode本体をインストール後、以下で切り替えます。

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

参考:

- [Apple Developer Program enrollment](https://developer.apple.com/help/account/membership/program-enrollment/)
- [Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)

## Phase 16C: Archive / Upload

ユーザーがXcodeからApp Store Connectへbuildをuploadします。

- [ ] XcodeでGeneric iOS Deviceまたは接続したiPhoneを選ぶ
- [ ] Product > Archive を実行する
- [ ] Archive OrganizerでDistribute Appを選ぶ
- [ ] App Store Connect uploadを選ぶ
- [ ] upload完了後、App Store ConnectのTestFlightタブでprocessing完了を待つ
- [ ] buildがTestFlightで選択可能になっていることを確認する

参考:

- [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)

## Phase 16D: TestFlight内部配布と実機スモーク

Season 1では内部配布だけを対象にします。外部テスター配布はSeason 2以降です。

- [ ] 内部テスターグループを作成する
- [ ] 自分を内部テスターに追加する
- [ ] buildを内部テスターへ配布する
- [ ] iPhoneでTestFlightアプリからMarkdown Memoryをインストールする
- [ ] 起動後にProduction URLが開く
- [ ] Googleログインできる
- [ ] Markdown作成、編集、保存、リロード後復元ができる
- [ ] 共有リンク作成、未ログイン閲覧、共有解除ができる
- [ ] アプリ内AIパネル表示とProvider切替ができる
- [ ] 外部AI導線が開ける
- [ ] 戻る/閉じる導線、Safe Area、横幅、文字崩れに重大な問題がない
- [ ] Web/PWA版と比べて重大な劣化がない

参考:

- [Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/)

## Phase 16E: Season 1完了記録

TestFlight実機確認が完了したら、CodexがSeason 1完了PRを作成します。

- [ ] READMEの現在地をSeason 1完了へ更新する
- [ ] RoadmapでPhase 16を完了へ更新する
- [ ] MaintainersにTestFlight確認日と範囲を記録する
- [ ] この文書にTestFlight build、確認日、確認範囲を記録する
- [ ] Season 2開始候補としてApp Store審査対策、iOS固有価値追加、Mac化を整理する

## 現在の状態

2026-06-21 時点で、Phase 16Aは完了し、Phase 16BのApple / Xcode準備待ちです。Phase 15までに、iOS shell追加、Debug build、Simulator起動確認、Production表示、ログイン後手動スモークは完了済みです。
