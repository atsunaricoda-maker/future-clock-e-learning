-- ============================================
-- 016: ハローワーク対応 — 修了証強化 + サイト設定テーブル
-- ============================================

-- 1. certificates テーブルに受講期間・総受講時間カラム追加
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS training_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS training_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_learning_minutes INTEGER;

COMMENT ON COLUMN certificates.training_start_date IS '受講開始日（enrolled_at のスナップショット）';
COMMENT ON COLUMN certificates.training_end_date IS '受講終了日（completed_at のスナップショット）';
COMMENT ON COLUMN certificates.total_learning_minutes IS '総受講時間（分）。コース全レッスンの duration_seconds 合計から算出';

-- 2. サイト設定テーブル（教育訓練施設情報等）
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 管理者はすべての操作可能
CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 認証済みユーザーは閲覧可能（証明書レンダリングで必要）
CREATE POLICY "Authenticated users can read site settings"
  ON site_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- デフォルト値をシード
INSERT INTO site_settings (key, value) VALUES
  ('organization_name', 'FutureClock'),
  ('representative_name', ''),
  ('organization_address', '')
ON CONFLICT (key) DO NOTHING;
