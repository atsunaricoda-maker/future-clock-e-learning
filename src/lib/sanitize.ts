/**
 * PostgREST フィルターインジェクション防止ユーティリティ
 *
 * Supabase の .or() / .filter() は文字列テンプレートを使うため、
 * ユーザー入力を直接埋め込むと構文操作のリスクがある。
 * この関数で特殊文字を除去・エスケープしてから使う。
 */

/**
 * PostgREST .or() フィルター用のサニタイズ
 * - LIKE ワイルドカード（%, _）をエスケープ
 * - PostgREST 構文文字（. , ( ) ）を除去
 * - バックスラッシュのダブルエスケープ対応
 */
export function sanitizeFilterInput(input: string): string {
  return input
    .replace(/\\/g, "\\\\")       // バックスラッシュを先にエスケープ
    .replace(/[%_]/g, (c) => `\\${c}`)  // LIKE ワイルドカードをエスケープ
    .replace(/[.,()]/g, "");             // PostgREST 構文文字を除去
}
