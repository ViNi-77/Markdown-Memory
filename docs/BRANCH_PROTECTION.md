# main ブランチ保護の推奨設定

このリポジトリでは、`main` へ直接変更せず、Pull Request と CI を通してから反映する運用にします。

## 現在の推奨値

| 設定                                             | 値                            |
| ------------------------------------------------ | ----------------------------- |
| Branch name pattern                              | `main`                        |
| Require a pull request before merging            | On                            |
| Require approvals                                | 任意。個人運用中は Off でも可 |
| Require status checks to pass before merging     | On                            |
| Required status checks                           | `品質ゲート`                  |
| Require branches to be up to date before merging | On                            |
| Require conversation resolution before merging   | On                            |
| Allow force pushes                               | Off                           |
| Allow deletions                                  | Off                           |

`品質ゲート` は `.github/workflows/ci.yml` の job 名です。

## GitHub 画面での設定手順

1. `https://github.com/ViNi-77/Markdown-Memory` を開く
2. `Settings` を開く
3. 左メニューの `Branches` を開く
4. `Branch protection rules` の `Add rule` を押す
5. `Branch name pattern` に `main` を入れる
6. 上の推奨値を設定する
7. `Create` または `Save changes` を押す

GitHub の公式ドキュメントでは、branch protection rule により、削除・force push の制限、必須ステータスチェック、Pull Request 必須化などを設定できます。

- <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches>
- <https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule>

## Codex から設定する場合

Codex から直接設定するには、以下のどちらかが必要です。

- GitHub CLI の再認証: `gh auth login -h github.com`
- ログイン済み Chrome を使う明示許可

どちらもない場合、リポジトリ設定そのものは変更できないため、このファイルの推奨値を見ながらGitHub画面で設定します。
