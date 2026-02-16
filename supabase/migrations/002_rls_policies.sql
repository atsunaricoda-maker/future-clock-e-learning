-- ============================================
-- FutureClock LMS - Row Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: Check if current user is admin
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- USERS
-- ============================================
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can manage all users"
  ON users FOR ALL
  USING (is_admin());

-- ============================================
-- COMPANIES
-- ============================================
CREATE POLICY "Admins can manage companies"
  ON companies FOR ALL
  USING (is_admin());

CREATE POLICY "Company members can view their company"
  ON companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = companies.id
    )
  );

-- ============================================
-- COURSES
-- ============================================
CREATE POLICY "Anyone can view published public courses"
  ON courses FOR SELECT
  USING (status = 'published' AND is_public = true);

CREATE POLICY "Company users can view assigned courses"
  ON courses FOR SELECT
  USING (
    status = 'published' AND
    EXISTS (
      SELECT 1 FROM company_courses cc
      JOIN users u ON u.company_id = cc.company_id
      WHERE cc.course_id = courses.id
      AND u.id = auth.uid()
      AND (cc.expires_at IS NULL OR cc.expires_at > NOW())
    )
  );

CREATE POLICY "Admins can manage all courses"
  ON courses FOR ALL
  USING (is_admin());

-- ============================================
-- COMPANY_COURSES
-- ============================================
CREATE POLICY "Admins can manage company courses"
  ON company_courses FOR ALL
  USING (is_admin());

CREATE POLICY "Company members can view their assignments"
  ON company_courses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.company_id = company_courses.company_id
    )
  );

-- ============================================
-- SECTIONS
-- ============================================
CREATE POLICY "Users can view sections of accessible courses"
  ON sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      WHERE c.id = sections.course_id
      AND (
        (c.status = 'published' AND c.is_public = true)
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.course_id = c.id AND e.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can manage sections"
  ON sections FOR ALL
  USING (is_admin());

-- ============================================
-- LESSONS
-- ============================================
CREATE POLICY "Users can view lessons of enrolled courses"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sections s
      JOIN courses c ON c.id = s.course_id
      WHERE s.id = lessons.section_id
      AND (
        lessons.is_preview = true
        OR is_admin()
        OR EXISTS (
          SELECT 1 FROM enrollments e
          WHERE e.course_id = c.id AND e.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Admins can manage lessons"
  ON lessons FOR ALL
  USING (is_admin());

-- ============================================
-- QUIZZES
-- ============================================
CREATE POLICY "Users can view quizzes of enrolled courses"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN sections s ON s.id = l.section_id
      JOIN enrollments e ON e.course_id = s.course_id
      WHERE l.id = quizzes.lesson_id
      AND e.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Admins can manage quizzes"
  ON quizzes FOR ALL
  USING (is_admin());

-- ============================================
-- QUESTIONS
-- ============================================
CREATE POLICY "Users can view questions during quiz"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN lessons l ON l.id = q.lesson_id
      JOIN sections s ON s.id = l.section_id
      JOIN enrollments e ON e.course_id = s.course_id
      WHERE q.id = questions.quiz_id
      AND e.user_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (is_admin());

-- ============================================
-- ENROLLMENTS
-- ============================================
CREATE POLICY "Users can view own enrollments"
  ON enrollments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can enroll themselves"
  ON enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage enrollments"
  ON enrollments FOR ALL
  USING (is_admin());

-- ============================================
-- LESSON_PROGRESS
-- ============================================
CREATE POLICY "Users can manage own progress"
  ON lesson_progress FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all progress"
  ON lesson_progress FOR SELECT
  USING (is_admin());

-- ============================================
-- QUIZ_ATTEMPTS
-- ============================================
CREATE POLICY "Users can manage own quiz attempts"
  ON quiz_attempts FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all quiz attempts"
  ON quiz_attempts FOR SELECT
  USING (is_admin());

-- ============================================
-- CERTIFICATES
-- ============================================
CREATE POLICY "Users can view own certificates"
  ON certificates FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage certificates"
  ON certificates FOR ALL
  USING (is_admin());
