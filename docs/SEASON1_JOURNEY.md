# Season 1 Journey

Season 1 は、Markdown Memory を「動くWebアプリ」から「ポートフォリオとして説明できるプロダクト」へ育てた期間です。

最終到達点は、Production Web/PWA の完成度を高めたうえで、iOS TestFlight 内部配布と iPhone 実機確認まで進めることでした。2026-06-25 に build `1.0.0 (1)` の TestFlight 内部配布と実機確認が完了し、Season 1 は完了です。

## 到達点

| 観点             | Season 1 の結果                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Web/PWA          | Production、Demo、PWA、オフライン案内、Apple Safari実機確認まで完了                             |
| Markdown管理     | 作成、編集、保存、検索、フォルダ整理、共有、全画面表示を通した                                  |
| AI UX            | Claude / GPT / Gemini のProvider切替、Provider別APIキー、AI提案の追記・置き換え確認を整えた     |
| 安全性           | 非公開MarkdownをService Workerでキャッシュしない、APIキーはブラウザ保存のみ、秘密情報露出を監査 |
| 運用             | CI、E2E、Vercel Production smoke、Runtime Logs、Health API、Cron保護を用意                      |
| ポートフォリオ   | README、Roadmap、Privacy / Terms、Maintainers docsからプロダクトの背景と品質を追える            |
| iOS / TestFlight | SFSafariViewControllerベースの最小shellを追加し、TestFlight内部配布とiPhone実機確認まで完了     |

## Timeline

| 区間        | 何を固めたか               | 主な成果                                                                                                            |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Phase 1-5   | Webアプリの基礎と運用下地  | Markdown workspace、AI helper、Pane resize、全画面表示、GitHub Actions、README構成図、運用監視、PWA準備を追加       |
| Phase 6     | スマホで読む体験           | スマホ幅の情報設計、本文閲覧優先の導線、フォルダ/アカウント操作、Markdown表示品質、コードブロック表示を改善         |
| Phase 7     | PWAとApple実機品質         | manifest、アイコン、Service Worker、オフライン案内、ログイン後データをキャッシュしない方針、Apple Safari確認を固定  |
| Phase 8     | Production実用導線とAI基盤 | Production smoke、白画面修正、本文検索復旧、Gemini修正、Claude / GPT / Gemini provider gatewayを追加                |
| Phase 9-10A | AI Assistの実用化          | AI設定UX、Provider別APIキー、AI提案の適用導線、置き換え確認、一時履歴、エラー時の秘密情報非露出を整理               |
| Phase 11-14 | Season 1再定義と公開品質   | TestFlightをSeason 1内へ再配置し、Privacy / Terms、アカウント削除、Production最終確認、READMEポートフォリオ化を完了 |
| Phase 15    | iOS最小shell検証           | `SFSafariViewController` shell、Debug/Release build、Simulator起動確認、Productionログイン後スモークを完了          |
| Phase 16    | TestFlight内部配布         | Apple Developer Program、App Store Connect、Archive upload、TestFlight内部配布、iPhone実機確認、Season 1完了記録    |

## Key Decisions

- Season 1 の完了条件は App Store本番公開ではなく、TestFlight内部配布と実機確認までにした。
- Googleログイン互換性を優先し、iOS shellは埋め込み `WKWebView` ではなく `SFSafariViewController` を採用した。
- Android Chrome はSeason 1の確認対象外とし、Apple端末に品質確認を集中した。
- 非公開Markdown本文、共有ページ、API応答はService Workerでキャッシュしない方針にした。
- Provider APIキーはDB保存せず、ブラウザ `localStorage` にProvider別で保存する方針にした。
- AI履歴の永続化、ストリーミング、モデル選択UI、一括AI処理はSeason 2以降へ送った。
- App Store公開、iOS固有価値追加、Macアプリ化はSeason 2以降へ送った。

## Verification Record

| 日付       | 確認内容                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------- |
| 2026-06-19 | Productionで保存、共有、AI連携、Provider切替、ブラウザ幅縮小時の本文ツールバー修正を確認 |
| 2026-06-20 | Privacy / Terms、アカウント削除導線、Apple Safari実機、Production軽量確認を完了          |
| 2026-06-20 | iOS shellのDebug/Release build、Simulator起動、ログイン後手動スモークを完了              |
| 2026-06-25 | TestFlight build `1.0.0 (1)` の内部配布とiPhone実機確認を完了                            |
| 2026-06-25 | 実機確認後の下部ナビ切替表示をPR #91で修正し、Production反映まで確認                     |

## Portfolio Notes

Season 1 の価値は、単に機能を並べたことではありません。

- ログイン、DB保存、共有、AI、PWA、Privacy、運用監視、TestFlightまでを一つのストーリーにした。
- ユーザーの実機確認とフィードバックを、Phase、PR、docsへ戻す運用を回した。
- 公開リポジトリとして、秘密情報や非公開Markdownを残さない運用を意識した。
- 迷ったものを全部入れず、Season 2へ送る判断を明文化した。

Season 2 では、App Store審査に向けて「Web/PWA shell」以上のiOS固有価値をどう足すかが中心になります。

## Related Docs

- [`SEASON1_ROADMAP.md`](SEASON1_ROADMAP.md)
- [`SEASON1_PHASE16_CHECK.md`](SEASON1_PHASE16_CHECK.md)
- [`PRODUCTION_SMOKE_CHECK.md`](PRODUCTION_SMOKE_CHECK.md)
- [`PWA_PHASE7_HANDOFF.md`](PWA_PHASE7_HANDOFF.md)
- [`MAINTAINERS.md`](MAINTAINERS.md)
