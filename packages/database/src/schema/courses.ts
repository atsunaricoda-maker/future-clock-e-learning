import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { users } from './users';

/**
 * カテゴリテーブル
 */
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  parentId: text('parent_id'), // self-reference for subcategories
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * コーステーブル
 */
export const courses = sqliteTable('courses', {
  id: text('id').primaryKey(),
  instructorId: text('instructor_id')
    .notNull()
    .references(() => users.id),
  categoryId: text('category_id')
    .references(() => categories.id),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  subtitle: text('subtitle'),
  description: text('description'),
  objectives: text('objectives'), // JSON array of learning objectives
  requirements: text('requirements'), // JSON array of requirements
  targetAudience: text('target_audience'), // JSON array
  level: text('level', { 
    enum: ['beginner', 'intermediate', 'advanced', 'all_levels'] 
  }).default('all_levels'),
  language: text('language').default('ja'),
  thumbnailUrl: text('thumbnail_url'),
  promoVideoUrl: text('promo_video_url'),
  price: integer('price').notNull().default(0), // in cents (JPY)
  discountPrice: integer('discount_price'),
  currency: text('currency').default('JPY'),
  status: text('status', { 
    enum: ['draft', 'pending_review', 'published', 'unpublished', 'rejected'] 
  }).default('draft'),
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  publishedAt: text('published_at'),
  totalDuration: integer('total_duration').default(0), // in seconds
  totalLectures: integer('total_lectures').default(0),
  averageRating: real('average_rating').default(0),
  totalReviews: integer('total_reviews').default(0),
  totalEnrollments: integer('total_enrollments').default(0),
  // リスキリング助成金対応
  isSubsidyEligible: integer('is_subsidy_eligible', { mode: 'boolean' }).default(false),
  subsidyCategory: text('subsidy_category'),
  requiredWatchTime: integer('required_watch_time'), // minimum watch time for completion
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
  deletedAt: text('deleted_at'),
});

/**
 * セクションテーブル（コースの章）
 */
export const sections = sqliteTable('sections', {
  id: text('id').primaryKey(),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * レクチャーテーブル（動画・コンテンツ）
 */
export const lectures = sqliteTable('lectures', {
  id: text('id').primaryKey(),
  sectionId: text('section_id')
    .notNull()
    .references(() => sections.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  contentType: text('content_type', { 
    enum: ['video', 'article', 'quiz', 'assignment'] 
  }).notNull().default('video'),
  sortOrder: integer('sort_order').notNull().default(0),
  duration: integer('duration').default(0), // in seconds
  isFree: integer('is_free', { mode: 'boolean' }).default(false),
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 動画テーブル
 */
export const videos = sqliteTable('videos', {
  id: text('id').primaryKey(),
  lectureId: text('lecture_id')
    .notNull()
    .references(() => lectures.id, { onDelete: 'cascade' })
    .unique(),
  originalUrl: text('original_url'), // R2 original file URL
  hlsUrl: text('hls_url'), // HLS master playlist URL
  thumbnailUrl: text('thumbnail_url'),
  duration: integer('duration').default(0), // in seconds
  resolution: text('resolution'), // e.g., "1920x1080"
  fileSize: integer('file_size'), // in bytes
  status: text('status', { 
    enum: ['uploading', 'processing', 'ready', 'error'] 
  }).default('uploading'),
  processingProgress: integer('processing_progress').default(0), // 0-100
  errorMessage: text('error_message'),
  // HLS暗号化対応
  encryptionKeyId: text('encryption_key_id'),
  isEncrypted: integer('is_encrypted', { mode: 'boolean' }).default(false),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 添付ファイルテーブル
 */
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  lectureId: text('lecture_id')
    .notNull()
    .references(() => lectures.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  fileUrl: text('file_url').notNull(),
  fileType: text('file_type'),
  fileSize: integer('file_size'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
});
