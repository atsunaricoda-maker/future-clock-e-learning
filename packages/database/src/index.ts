/**
 * Database Package Entry Point
 * D1 (SQLite) database with Drizzle ORM
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export * from './schema';
export { schema };

/**
 * D1データベースクライアントの作成
 */
export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;

/**
 * UUID生成（crypto.randomUUID()を使用）
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 現在のISO日時文字列を取得
 */
export function nowISO(): string {
  return new Date().toISOString();
}
