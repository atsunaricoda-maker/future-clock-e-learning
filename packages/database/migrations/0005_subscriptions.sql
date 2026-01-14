-- B2C Subscription Schema
-- サブスクリプションプランと購読管理

-- サブスクリプションプラン
CREATE TABLE IF NOT EXISTS el_subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0,
  price_yearly INTEGER NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'JPY',
  features TEXT, -- JSON array of features
  max_courses INTEGER, -- NULL = unlimited
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_el_subscription_plans_slug ON el_subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_el_subscription_plans_active ON el_subscription_plans(is_active);

-- ユーザーサブスクリプション
CREATE TABLE IF NOT EXISTS el_user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES el_users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES el_subscription_plans(id),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'paused', 'expired')),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at_period_end INTEGER DEFAULT 0,
  canceled_at TEXT,
  trial_start TEXT,
  trial_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_el_user_subscriptions_user ON el_user_subscriptions(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_el_user_subscriptions_stripe ON el_user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_el_user_subscriptions_status ON el_user_subscriptions(status);

-- サブスクリプション支払い履歴
CREATE TABLE IF NOT EXISTS el_subscription_payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL REFERENCES el_user_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES el_users(id),
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'JPY',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  billing_period_start TEXT,
  billing_period_end TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_el_subscription_payments_subscription ON el_subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_el_subscription_payments_user ON el_subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_el_subscription_payments_stripe ON el_subscription_payments(stripe_invoice_id);

-- 初期プランデータ
INSERT OR IGNORE INTO el_subscription_plans (id, name, slug, description, price_monthly, price_yearly, features, max_courses, sort_order)
VALUES 
  (
    'plan-standard',
    'Standard',
    'standard',
    'すべてのコースにアクセス可能な標準プラン',
    2980,
    29800,
    '["全コースアクセス", "動画ダウンロード（一部）", "修了証発行", "Q&Aサポート"]',
    NULL,
    1
  ),
  (
    'plan-premium',
    'Premium',
    'premium',
    '優先サポートと追加特典付きのプレミアムプラン',
    4980,
    49800,
    '["全コースアクセス", "動画ダウンロード", "修了証発行", "優先Q&Aサポート", "ライブセッション参加", "1対1メンタリング（月1回）"]',
    NULL,
    2
  );
