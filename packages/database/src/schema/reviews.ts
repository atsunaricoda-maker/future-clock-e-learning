import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { courses, lectures } from './courses';

/**
 * レビューテーブル
 */
export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id),
  rating: integer('rating').notNull(), // 1-5
  title: text('title'),
  content: text('content'),
  isVerifiedPurchase: integer('is_verified_purchase', { mode: 'boolean' }).default(false),
  helpfulCount: integer('helpful_count').default(0),
  status: text('status', { 
    enum: ['pending', 'approved', 'rejected', 'hidden'] 
  }).default('pending'),
  instructorResponse: text('instructor_response'),
  instructorRespondedAt: text('instructor_responded_at'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * Q&A質問テーブル
 */
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id),
  lectureId: text('lecture_id')
    .references(() => lectures.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status', { 
    enum: ['open', 'answered', 'closed'] 
  }).default('open'),
  upvoteCount: integer('upvote_count').default(0),
  answerCount: integer('answer_count').default(0),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * Q&A回答テーブル
 */
export const answers = sqliteTable('answers', {
  id: text('id').primaryKey(),
  questionId: text('question_id')
    .notNull()
    .references(() => questions.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  content: text('content').notNull(),
  isInstructorAnswer: integer('is_instructor_answer', { mode: 'boolean' }).default(false),
  isAccepted: integer('is_accepted', { mode: 'boolean' }).default(false),
  upvoteCount: integer('upvote_count').default(0),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 通知テーブル
 */
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  type: text('type', { 
    enum: [
      'enrollment', 'payment', 'review', 'question', 'answer',
      'course_published', 'course_updated', 'certificate_issued',
      'payout', 'system'
    ] 
  }).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link'),
  metadata: text('metadata'), // JSON
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  readAt: text('read_at'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
});
