-- e-Learning Platform Initial Schema
-- Based on データベース設計１.rtf

-- =============================================
-- Users & Profiles
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'instructor', 'admin', 'super_admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'deleted')),
  email_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  timezone TEXT DEFAULT 'Asia/Tokyo',
  language TEXT DEFAULT 'ja',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

CREATE TABLE IF NOT EXISTS instructor_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  expertise TEXT,
  experience TEXT,
  social_links TEXT,
  website TEXT,
  stripe_account_id TEXT,
  payout_enabled INTEGER DEFAULT 0,
  commission_rate INTEGER DEFAULT 30,
  total_earnings INTEGER DEFAULT 0,
  pending_balance INTEGER DEFAULT 0,
  verified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_instructor_profiles_user_id ON instructor_profiles(user_id);

CREATE TABLE IF NOT EXISTS social_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'github', 'twitter', 'linkedin')),
  provider_account_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);

-- =============================================
-- Categories & Courses
-- =============================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL REFERENCES users(id),
  category_id TEXT REFERENCES categories(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  subtitle TEXT,
  description TEXT,
  objectives TEXT,
  requirements TEXT,
  target_audience TEXT,
  level TEXT DEFAULT 'all_levels' CHECK (level IN ('beginner', 'intermediate', 'advanced', 'all_levels')),
  language TEXT DEFAULT 'ja',
  thumbnail_url TEXT,
  promo_video_url TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  discount_price INTEGER,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'unpublished', 'rejected')),
  is_published INTEGER DEFAULT 0,
  published_at TEXT,
  total_duration INTEGER DEFAULT 0,
  total_lectures INTEGER DEFAULT 0,
  average_rating REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_enrollments INTEGER DEFAULT 0,
  is_subsidy_eligible INTEGER DEFAULT 0,
  subsidy_category TEXT,
  required_watch_time INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);

CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sections_course_id ON sections(course_id);

CREATE TABLE IF NOT EXISTS lectures (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL DEFAULT 'video' CHECK (content_type IN ('video', 'article', 'quiz', 'assignment')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  duration INTEGER DEFAULT 0,
  is_free INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lectures_section_id ON lectures(section_id);

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL UNIQUE REFERENCES lectures(id) ON DELETE CASCADE,
  original_url TEXT,
  hls_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  resolution TEXT,
  file_size INTEGER,
  status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
  processing_progress INTEGER DEFAULT 0,
  error_message TEXT,
  encryption_key_id TEXT,
  is_encrypted INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_videos_lecture_id ON videos(lecture_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  lecture_id TEXT NOT NULL REFERENCES lectures(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_attachments_lecture_id ON attachments(lecture_id);

-- =============================================
-- Enrollments & Progress
-- =============================================

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'refunded')),
  progress INTEGER DEFAULT 0,
  completed_lectures INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0,
  last_accessed_at TEXT,
  completed_at TEXT,
  certificate_issued_at TEXT,
  certificate_url TEXT,
  purchase_price INTEGER NOT NULL DEFAULT 0,
  purchase_currency TEXT DEFAULT 'JPY',
  payment_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);

CREATE TABLE IF NOT EXISTS lecture_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  lecture_id TEXT NOT NULL REFERENCES lectures(id),
  watched_duration INTEGER DEFAULT 0,
  last_position INTEGER DEFAULT 0,
  is_completed INTEGER DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lecture_progress_user_id ON lecture_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lecture_progress_lecture_id ON lecture_progress(lecture_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_lecture_progress_user_lecture ON lecture_progress(user_id, lecture_id);

CREATE TABLE IF NOT EXISTS watch_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  lecture_id TEXT NOT NULL REFERENCES lectures(id),
  enrollment_id TEXT NOT NULL REFERENCES enrollments(id),
  session_id TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT,
  start_position INTEGER DEFAULT 0,
  end_position INTEGER,
  watched_seconds INTEGER DEFAULT 0,
  playback_rate REAL DEFAULT 1.0,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  is_valid INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_watch_logs_user_id ON watch_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_logs_lecture_id ON watch_logs(lecture_id);
CREATE INDEX IF NOT EXISTS idx_watch_logs_enrollment_id ON watch_logs(enrollment_id);

-- =============================================
-- Payments
-- =============================================

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'canceled')),
  payment_method TEXT,
  receipt_url TEXT,
  refunded_at TEXT,
  refund_amount INTEGER,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_id ON payments(course_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value INTEGER NOT NULL,
  currency TEXT DEFAULT 'JPY',
  min_purchase INTEGER DEFAULT 0,
  max_discount INTEGER,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  course_id TEXT REFERENCES courses(id),
  instructor_id TEXT REFERENCES users(id),
  valid_from TEXT,
  valid_until TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  discount_applied INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  instructor_id TEXT NOT NULL REFERENCES users(id),
  stripe_payout_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'JPY',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'canceled')),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  payment_count INTEGER DEFAULT 0,
  gross_amount INTEGER DEFAULT 0,
  platform_fee INTEGER DEFAULT 0,
  net_amount INTEGER DEFAULT 0,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payouts_instructor_id ON payouts(instructor_id);

CREATE TABLE IF NOT EXISTS payout_items (
  id TEXT PRIMARY KEY,
  payout_id TEXT NOT NULL REFERENCES payouts(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  gross_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  net_amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================
-- Reviews & Q&A
-- =============================================

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified_purchase INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  instructor_response TEXT,
  instructor_responded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_course_id ON reviews(course_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_course ON reviews(user_id, course_id);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  course_id TEXT NOT NULL REFERENCES courses(id),
  lecture_id TEXT REFERENCES lectures(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  upvote_count INTEGER DEFAULT 0,
  answer_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_instructor_answer INTEGER DEFAULT 0,
  is_accepted INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN (
    'enrollment', 'payment', 'review', 'question', 'answer',
    'course_published', 'course_updated', 'certificate_issued',
    'payout', 'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata TEXT,
  is_read INTEGER DEFAULT 0,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Wishlists table
CREATE TABLE IF NOT EXISTS wishlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_course_id ON wishlists(course_id);

-- Password Reset Tokens
CREATE TABLE IF NOT EXISTS el_password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES el_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON el_password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON el_password_reset_tokens(user_id);
