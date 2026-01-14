import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * ユーザーテーブル
 * 設計書: データベース設計１.rtf
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // 独自認証用
  role: text('role', { enum: ['student', 'instructor', 'admin', 'super_admin'] })
    .notNull()
    .default('student'),
  status: text('status', { enum: ['active', 'suspended', 'pending', 'deleted'] })
    .notNull()
    .default('active'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
  deletedAt: text('deleted_at'),
});

/**
 * ユーザープロフィールテーブル
 */
export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  timezone: text('timezone').default('Asia/Tokyo'),
  language: text('language').default('ja'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 講師プロフィールテーブル
 */
export const instructorProfiles = sqliteTable('instructor_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  headline: text('headline'),
  expertise: text('expertise'), // JSON array as text
  experience: text('experience'),
  socialLinks: text('social_links'), // JSON object as text
  website: text('website'),
  stripeAccountId: text('stripe_account_id'),
  payoutEnabled: integer('payout_enabled', { mode: 'boolean' }).default(false),
  commissionRate: integer('commission_rate').default(30), // 30% platform fee
  totalEarnings: integer('total_earnings').default(0), // in cents
  pendingBalance: integer('pending_balance').default(0), // in cents
  verifiedAt: text('verified_at'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * ソーシャルアカウント連携テーブル
 */
export const socialAccounts = sqliteTable('social_accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider', { 
    enum: ['google', 'github', 'twitter', 'linkedin'] 
  }).notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
});

// Relations will be defined separately
