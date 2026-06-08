#!/usr/bin/env node

/**
 * components/workspace 配下の .tsx ファイルを走査し、
 * 同一クラス文字列内で `bg-card` と `rounded-md` が共起する箇所を検出して warn 表示する。
 *
 * 使い方:
 *   node scripts/check-radius-drift.mjs
 *   npm run check:radius
 *
 * 参照: mockup-guide.md §9「角丸の役割マッピング」
 *   bg-card で囲った「島」は原則 rounded-lg を使う（SKILL.md 階層ルール 2）。
 *   rounded-md は「メニューアイテム / リスト行 / サイドバー行」向け。
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const TARGET_DIR = join(import.meta.dirname, "..", "components", "workspace");
const PATTERN = /bg-card.*rounded-md|rounded-md.*bg-card/;

function walk(dir) {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      entries.push(...walk(full));
    } else if (name.endsWith(".tsx") || name.endsWith(".ts")) {
      entries.push(full);
    }
  }
  return entries;
}

let warnings = 0;

for (const file of walk(TARGET_DIR)) {
  const lines = readFileSync(file, "utf-8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (PATTERN.test(lines[i])) {
      const rel = relative(join(import.meta.dirname, ".."), file);
      console.warn(
        `⚠  ${rel}:${i + 1}  bg-card + rounded-md の共起（rounded-lg を検討）`,
      );
      console.warn(`   ${lines[i].trim()}`);
      console.warn();
      warnings++;
    }
  }
}

if (warnings > 0) {
  console.warn(`${warnings} 件の角丸ドリフト候補が見つかりました。`);
  console.warn("参照: mockup-guide.md §9 / SKILL.md「角丸の階層ルール」");
  process.exit(1);
} else {
  console.log("✓ 角丸ドリフト候補なし");
}
