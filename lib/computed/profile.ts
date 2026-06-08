/**
 * Profile に関する派生計算ヘルパー。
 *
 * ADR-0014「shadcn 標準フォームによる Pane 4 編集 UI」で Profile から `age` を
 * 撤去し、`birthday` から派生計算する方針に変更したため、その単一ソースとしてここに集約する。
 *
 * 設計原則:
 *   - 純粋関数のみ（副作用なし、`new Date()` の都度呼び出しは許容）
 *   - 不正/空入力は空文字 ""（または undefined）で返す（throw しない）
 *   - 日付の保存形式は ANSI / ISO 8601 短形式（YYYY-MM-DD）に統一
 */

/**
 * `YYYY-MM-DD` 形式の文字列を `Date` に変換する。
 * 空文字 / 不正フォーマットは `undefined` を返す。
 *
 * 時刻は `T00:00:00` をローカルタイムで補い、タイムゾーン跨ぎを避ける。
 */
export function parseISODate(s: string): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s + "T00:00:00");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * `Date` を `YYYY-MM-DD` 形式の文字列に整形する。
 * `undefined` または不正な Date は空文字を返す。
 */
export function formatISODate(d: Date | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 生年月日から年齢を派生計算し、「N 歳」形式で返す。
 * 空 / 不正な birthday は空文字を返す（UI 側で「未表示」になる）。
 *
 * 「今日」は `new Date()`。Pane 4 は `"use client"` なのでクライアント側で都度評価される。
 * SSR / hydration mismatch は発生しない。
 */
export function calculateAge(birthday: string): string {
  const birth = parseISODate(birthday);
  if (!birth) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  if (age < 0) return "";
  return `${age} 歳`;
}
