# workspace-ui-kit

採用管理ドメインの **4ペイン Next.js 16 × shadcn/ui ワークスペース雛形**。
受講生向けの動かし方・業種変更手順は README を参照。

## 視覚 SSoT

画面の SSoT（Single Source of Truth = 情報の正本）は `components/workspace/Workspace.tsx`。
**ADR と実装で矛盾したら ADR-003 が正、実装は段階的に追従する**。
（ADR-0015 仕様への追従は別タスクで進める。詳細は ADR-003 §13 R1 参照）

- [ADR 一覧](openspec/decision/) — ペイン責務・デザインシステム・shadcn idiom 等の決定記録

## 同梱スキル

| スキル                      | いつ発動するか                                        | パス                                                            |
| --------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| designing-workspace-ui      | ペイン変更・色変更・コンポーネント追加など UI 作業    | [SKILL.md](.claude/skills/designing-workspace-ui/SKILL.md)      |
| shadcn                      | shadcn 部品の追加・カスタマイズ                       | [SKILL.md](.claude/skills/shadcn/SKILL.md)                      |
| next-best-practices         | Next.js 16 のファイル規約・RSC 境界・async パターン等 | [SKILL.md](.claude/skills/next-best-practices/SKILL.md)         |
| vercel-react-best-practices | React 性能最適化（70 ルール / 8 カテゴリ）            | [SKILL.md](.claude/skills/vercel-react-best-practices/SKILL.md) |

MUST: Next.js のコードを書く前に `node_modules/next/dist/docs/` の該当ドキュメントを読む。学習データではなくバンドル版が正。

## 編集の方針

IMPORTANT: 以下を守ること。

- **UI 変更を始める前に `/designing-workspace-ui` スキルを起動する**。トークン・部品・レイアウトで足りないときは決定木 3a〜3d でユーザー確認し、独断で SSoT を広げない
- **フィールド編集は `components/primitives/Inline*`（shadcn 標準フォーム、border-input + bg-card）を再利用**。鉛筆 / 「編集」ボタン / 編集専用モーダルに逃がさない。業務 Dialog（追加・削除・プレビュー等）は既存パターン踏襲で可
- **shadcn 部品の更新は `npx shadcn@latest add ... --diff` で確認**。`--overwrite` は本人の明示許可なしに使わない（独自 variant が消えるため）

## コード生成ルール

`components/` 配下のファイルを編集する際は、以下を必ず守る。詳しい根拠と Incorrect/Correct ペアは [coding-rules.md](.claude/skills/designing-workspace-ui/references/coding-rules.md) に集約している:

- 子要素の間隔は親で管理する（`flex flex-col gap-*` を使う、`space-y-*` は使わない）
- 部品の見た目を呼び出し側で打ち消さない（色・フォントサイズ・フォントウェイトの `className` 上書きはしない。部品側に variant を追加する）
- 色は役割で名前付けされたトークンを使う（`bg-primary` 等。`bg-blue-500` のような色番号は使わない）
- 正方形の要素には `size-N` を使う（`w-N h-N` ではなく）
- このプロジェクトは shadcn の **base**（Base UI）を使用。カスタムトリガーには `asChild` ではなく `render` を使う
- shadcn の部品（Button / Card / Badge / Dialog 等）が使えるなら、自前の div で代替しない
- UI の変更前に `/designing-workspace-ui` スキルを必ず読む
- 派生 state を Effect で複製しない（レンダーで計算する）。props 変更追従の Effect+setState は避け、リセットは key でリマウント。ユーザー操作起因の副作用は state フラグ+Effect より直接イベントハンドラに置く

## 技術スタック

- Next.js 16 / React 19 / TypeScript（strict）
- Tailwind CSS v4（`@theme` で CSS 変数）
- shadcn/ui（base-nova / `@base-ui/react`）
- lucide-react（アイコン）
- `zod`（ランタイム検証）

## コマンド

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド
npm run lint         # ESLint
npm run test         # Vitest スモークテスト
npm run format       # Prettier
npm run check:radius # 角丸ドリフト検出
```

## 配布制約

- `.distignore` で `openspec/` `AGENTS.md` は配布対象外（受講生の Gitea リポジトリに含まれない）
- `CLAUDE.md` と `.claude/skills/*` は配布される（受講生環境の AI が読む）
- 配布手順は親リポジトリの `managing-ads-gitea` スキルに従う

## やらないこと

- DB 接続・認証（次フェーズ）
- `react-beautiful-dnd`（廃止ライブラリ）への置き換え
