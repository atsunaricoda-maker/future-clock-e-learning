-- ============================================
-- 015: PPV（コース課金）機能
-- ============================================

-- courses テーブルに price カラム追加（JPY、整数）
ALTER TABLE courses ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0;
COMMENT ON COLUMN courses.price IS '受講価格（円）。0=無料';

-- 購入ステータスenum
CREATE TYPE purchase_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE payment_method AS ENUM ('stripe', 'bank_transfer');

-- purchases テーブル
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status purchase_status NOT NULL DEFAULT 'pending',
  payment_method payment_method NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id, stripe_session_id)
);

-- RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の購入のみ閲覧可
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);

-- サービスロール（サーバーサイド）は全操作可
CREATE POLICY "Service role can manage purchases"
  ON purchases FOR ALL
  USING (auth.role() = 'service_role');

-- 銀行振込のpending重複防止（NULLのstripe_session_idでUNIQUE効かないため）
CREATE UNIQUE INDEX purchases_bank_transfer_pending_unique
  ON purchases (user_id, course_id)
  WHERE payment_method = 'bank_transfer' AND status = 'pending';
