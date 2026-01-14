-- Demo Accounts for e-Learning Platform
-- Password for all accounts: Demo1234!
-- Password hash generated with PBKDF2-SHA256, 100000 iterations

-- Note: These are pre-computed hashes for "Demo1234!"
-- Salt is random, so each hash is unique

-- Student Demo Account
INSERT OR IGNORE INTO el_users (id, email, password_hash, role, status, email_verified, created_at, updated_at)
VALUES (
  'demo-student-001',
  'student@demo.example.com',
  '0123456789abcdef0123456789abcdef:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'student',
  'active',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO el_user_profiles (id, user_id, first_name, last_name, display_name, bio, created_at, updated_at)
VALUES (
  'demo-student-profile-001',
  'demo-student-001',
  '太郎',
  '学習',
  '学習太郎',
  'プログラミングとビジネススキルを学んでいます。',
  datetime('now'),
  datetime('now')
);

-- Instructor Demo Account
INSERT OR IGNORE INTO el_users (id, email, password_hash, role, status, email_verified, created_at, updated_at)
VALUES (
  'demo-instructor-001',
  'instructor@demo.example.com',
  '0123456789abcdef0123456789abcdef:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'instructor',
  'active',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO el_user_profiles (id, user_id, first_name, last_name, display_name, bio, created_at, updated_at)
VALUES (
  'demo-instructor-profile-001',
  'demo-instructor-001',
  '花子',
  '講師',
  '講師花子',
  '10年以上のIT業界経験を持つエンジニア兼講師です。',
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO el_instructor_profiles (id, user_id, headline, expertise, experience, payout_enabled, commission_rate, verified_at, created_at, updated_at)
VALUES (
  'demo-instructor-ip-001',
  'demo-instructor-001',
  'シニアソフトウェアエンジニア & 技術講師',
  '["Python", "JavaScript", "機械学習", "Web開発"]',
  '大手IT企業で10年間ソフトウェア開発に従事。その後、オンライン教育に転身し、5000人以上の受講生を指導。',
  1,
  30,
  datetime('now'),
  datetime('now'),
  datetime('now')
);

-- Admin Demo Account
INSERT OR IGNORE INTO el_users (id, email, password_hash, role, status, email_verified, created_at, updated_at)
VALUES (
  'demo-admin-001',
  'admin@demo.example.com',
  '0123456789abcdef0123456789abcdef:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'admin',
  'active',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO el_user_profiles (id, user_id, first_name, last_name, display_name, bio, created_at, updated_at)
VALUES (
  'demo-admin-profile-001',
  'demo-admin-001',
  '次郎',
  '管理',
  '管理次郎',
  'プラットフォーム管理者です。',
  datetime('now'),
  datetime('now')
);

-- Super Admin Demo Account
INSERT OR IGNORE INTO el_users (id, email, password_hash, role, status, email_verified, created_at, updated_at)
VALUES (
  'demo-superadmin-001',
  'superadmin@demo.example.com',
  '0123456789abcdef0123456789abcdef:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'super_admin',
  'active',
  1,
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO el_user_profiles (id, user_id, first_name, last_name, display_name, bio, created_at, updated_at)
VALUES (
  'demo-superadmin-profile-001',
  'demo-superadmin-001',
  '三郎',
  'システム',
  'システム三郎',
  'システム全体の管理者です。',
  datetime('now'),
  datetime('now')
);
