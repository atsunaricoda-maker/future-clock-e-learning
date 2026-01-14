import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { courses } from './courses';

/**
 * 決済テーブル
 */
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeSessionId: text('stripe_session_id'),
  amount: integer('amount').notNull(), // in smallest currency unit
  currency: text('currency').default('JPY'),
  status: text('status', { 
    enum: ['pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled'] 
  }).default('pending'),
  paymentMethod: text('payment_method'),
  receiptUrl: text('receipt_url'),
  refundedAt: text('refunded_at'),
  refundAmount: integer('refund_amount'),
  metadata: text('metadata'), // JSON
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * クーポンテーブル
 */
export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type', { 
    enum: ['percentage', 'fixed'] 
  }).notNull(),
  discountValue: integer('discount_value').notNull(), // percentage (0-100) or fixed amount
  currency: text('currency').default('JPY'),
  minPurchase: integer('min_purchase').default(0),
  maxDiscount: integer('max_discount'), // max discount for percentage type
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0),
  courseId: text('course_id')
    .references(() => courses.id), // null = all courses
  instructorId: text('instructor_id')
    .references(() => users.id),
  validFrom: text('valid_from'),
  validUntil: text('valid_until'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * クーポン使用履歴テーブル
 */
export const couponUsages = sqliteTable('coupon_usages', {
  id: text('id').primaryKey(),
  couponId: text('coupon_id')
    .notNull()
    .references(() => coupons.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  paymentId: text('payment_id')
    .notNull()
    .references(() => payments.id),
  discountApplied: integer('discount_applied').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 収益分配テーブル（講師への支払い）
 */
export const payouts = sqliteTable('payouts', {
  id: text('id').primaryKey(),
  instructorId: text('instructor_id')
    .notNull()
    .references(() => users.id),
  stripePayoutId: text('stripe_payout_id'),
  amount: integer('amount').notNull(), // in smallest currency unit
  currency: text('currency').default('JPY'),
  status: text('status', { 
    enum: ['pending', 'processing', 'paid', 'failed', 'canceled'] 
  }).default('pending'),
  periodStart: text('period_start').notNull(),
  periodEnd: text('period_end').notNull(),
  paymentCount: integer('payment_count').default(0),
  grossAmount: integer('gross_amount').default(0), // before fees
  platformFee: integer('platform_fee').default(0),
  netAmount: integer('net_amount').default(0), // after fees
  paidAt: text('paid_at'),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text('updated_at')
    .notNull()
    .default("(datetime('now'))"),
});

/**
 * 収益分配明細テーブル
 */
export const payoutItems = sqliteTable('payout_items', {
  id: text('id').primaryKey(),
  payoutId: text('payout_id')
    .notNull()
    .references(() => payouts.id),
  paymentId: text('payment_id')
    .notNull()
    .references(() => payments.id),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id),
  grossAmount: integer('gross_amount').notNull(),
  platformFee: integer('platform_fee').notNull(),
  netAmount: integer('net_amount').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default("(datetime('now'))"),
});
