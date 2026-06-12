import type { Document, Folder } from "@/lib/db/schema";

const DEMO_USER_ID = "demo-user";
const CREATED_AT = new Date("2026-06-12T00:00:00.000Z");
const UPDATED_AT = new Date("2026-06-12T09:00:00.000Z");

export const demoFolders: Folder[] = [
  {
    id: "demo-folder-inbox",
    userId: DEMO_USER_ID,
    name: "AIメモ",
    createdAt: CREATED_AT,
  },
  {
    id: "demo-folder-share",
    userId: DEMO_USER_ID,
    name: "共有候補",
    createdAt: CREATED_AT,
  },
];

export const demoDocuments: Document[] = [
  {
    id: "demo-doc-overview",
    userId: DEMO_USER_ID,
    folderId: "demo-folder-inbox",
    name: "Markdown Memory の使い方.md",
    content: `# Markdown Memory

AIが生成したMarkdownを、あとから探しやすい形で保存するためのワークスペースです。

## できること

- Markdownの作成・編集・プレビュー
- フォルダ整理
- \`.md\` ファイルのアップロード
- 共有リンクの作成
- Claude / ChatGPT / Gemini への再投入

## メモ

このデモは保存用データベースには接続しません。ログイン後の本体では、自分のMarkdownだけが保存・表示されます。
`,
    isPublic: false,
    shareToken: null,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
  },
  {
    id: "demo-doc-template",
    userId: DEMO_USER_ID,
    folderId: "demo-folder-share",
    name: "共有メモのテンプレ.md",
    content: `# 共有メモ

## 背景

ここに共有したい前提を書きます。

## 決定事項

- 決定したこと
- 次に確認すること

## 次のアクション

- [ ] 担当者を決める
- [ ] 期限を決める
- [ ] 共有リンクを送る
`,
    isPublic: false,
    shareToken: null,
    createdAt: CREATED_AT,
    updatedAt: new Date("2026-06-12T08:30:00.000Z"),
  },
];
