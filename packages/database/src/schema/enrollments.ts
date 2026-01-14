import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { courses, lectures } from './courses';

/**
 * 受講登録テーブル
 */
export const enrollments = sqliteTable('enrollments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id),
  status: text('status', { 
    enum: ['active', 'completed', 'expired', 'refunded'] 
  }).default('active'),
  progress: integer('progress').default(0), // 0-100
  completedLectures: integer('completed_lectures').default(0),
  totalWatchTime: integer('total_watch_time').default(0), // in seconds
  lastAccessedAt: text('last_accessed_at'),
  completedAt: text('completed_at'),
  // 助成金対応
  certificateIssuedAt: text('certificate_issued_at'),
  certificateUrl: text('certificate_url'),
  // 購入情報
  purchasePrice: integer('purchase_price').notNull().default(0),
  purchaseCurrency: text('purchase_currency').default('JPY'),
  paymentId: text('payment_id'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * レクチャー進捗テーブル
 */
export const lectureProgress = sqliteTable('lecture_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  lectureId: text('lecture_id')
    .notNull()
    .references(() => lectures.id),
  watchedDuration: integer('watched_duration').default(0), // in seconds
  lastPosition: integer('last_position').default(0), // last playback position in seconds
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  completedAt: text('completed_at'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 視聴ログテーブル（助成金対応：詳細な視聴記録）
 */
export const watchLogs = sqliteTable('watch_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  lectureId: text('lecture_id')
    .notNull()
    .references(() => lectures.id),
  enrollmentId: text('enrollment_id')
    .notNull()
    .references(() => enrollments.id),
  sessionId: text('session_id').notNull(), // unique session identifier
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  startPosition: integer('start_position').default(0),
  endPosition: integer('end_position'),
  watchedSeconds: integer('watched_seconds').default(0),
  playbackRate: real('playback_rate').default(1.0),
  // 不正検知用
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  deviceInfo: text('device_info'), // JSON
  isValid: integer('is_valid', { mode: 'boolean' }).default(true),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
});
