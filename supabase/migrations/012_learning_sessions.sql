-- ============================================
-- 012: 学習セッション管理（出勤簿突合対応）
-- ============================================

-- ログアウト理由 ENUM
CREATE TYPE logout_reason AS ENUM ('manual', 'browser_close', 'inactivity', 'session_expired');

-- 学習セッションテーブル
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  logout_reason logout_reason,
  duration_minutes INTEGER,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_learning_sessions_user_login ON learning_sessions(user_id, login_at DESC);
CREATE INDEX idx_learning_sessions_user_active ON learning_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_learning_sessions_login_at ON learning_sessions(login_at);

-- 学習アクティビティログ（ハートビート記録）
CREATE TABLE learning_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activity_type VARCHAR(50) DEFAULT 'heartbeat',
  metadata JSONB
);

-- インデックス
CREATE INDEX idx_learning_activity_logs_session ON learning_activity_logs(session_id, activity_at);
CREATE INDEX idx_learning_activity_logs_user ON learning_activity_logs(user_id, activity_at DESC);

-- ============================================
-- RLS ポリシー: learning_sessions
-- ============================================
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

-- 自分のセッションは読取OK
CREATE POLICY "Users can view own sessions"
  ON learning_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- 管理者は全セッション読取OK
CREATE POLICY "Admins can view all sessions"
  ON learning_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 企業管理者は自社メンバーのセッション読取OK
CREATE POLICY "Company admins can view member sessions"
  ON learning_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'company_admin'
        AND admin_user.company_id = (
          SELECT company_id FROM users WHERE id = learning_sessions.user_id
        )
    )
  );

-- 認証ユーザーは自分のセッションをINSERT可能
CREATE POLICY "Users can insert own sessions"
  ON learning_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 認証ユーザーは自分のセッションをUPDATE可能
CREATE POLICY "Users can update own sessions"
  ON learning_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS ポリシー: learning_activity_logs
-- ============================================
ALTER TABLE learning_activity_logs ENABLE ROW LEVEL SECURITY;

-- 自分のログは読取OK
CREATE POLICY "Users can view own activity logs"
  ON learning_activity_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 管理者は全ログ読取OK
CREATE POLICY "Admins can view all activity logs"
  ON learning_activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 企業管理者は自社メンバーのログ読取OK
CREATE POLICY "Company admins can view member activity logs"
  ON learning_activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users AS admin_user
      WHERE admin_user.id = auth.uid()
        AND admin_user.role = 'company_admin'
        AND admin_user.company_id = (
          SELECT company_id FROM users WHERE id = learning_activity_logs.user_id
        )
    )
  );

-- 認証ユーザーは自分のログをINSERT可能
CREATE POLICY "Users can insert own activity logs"
  ON learning_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
