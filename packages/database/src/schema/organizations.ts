import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';

/**
 * 組織テーブル（Phase 2以降の B2B 対応用、スキーマのみ作成）
 */
export const organizations = sqliteTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  logoUrl: text('logo_url'),
  website: text('website'),
  industry: text('industry'),
  size: text('size', { 
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'] 
  }),
  status: text('status', { 
    enum: ['active', 'suspended', 'pending'] 
  }).default('pending'),
  billingEmail: text('billing_email'),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
  deletedAt: text('deleted_at'),
});

/**
 * 組織メンバーテーブル
 */
export const organizationMembers = sqliteTable('organization_members', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  role: text('role', { 
    enum: ['owner', 'admin', 'manager', 'member'] 
  }).default('member'),
  joinedAt: text('joined_at')
    .notNull()
    .default("(datetime('now'))"),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 組織グループテーブル
 */
export const organizationGroups = sqliteTable('organization_groups', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 組織グループメンバーテーブル
 */
export const organizationGroupMembers = sqliteTable('organization_group_members', {
  id: text('id').primaryKey(),
  groupId: text('group_id')
    .notNull()
    .references(() => organizationGroups.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
});
