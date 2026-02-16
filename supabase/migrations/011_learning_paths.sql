-- Learning paths table
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  difficulty_level VARCHAR(50),
  estimated_duration_min INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Learning path courses junction table (ordered)
CREATE TABLE IF NOT EXISTS learning_path_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (learning_path_id, course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_learning_paths_published ON learning_paths (is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_path ON learning_path_courses (learning_path_id, order_index);

-- RLS
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_courses ENABLE ROW LEVEL SECURITY;

-- Anyone can read published learning paths
CREATE POLICY "Published learning paths are readable"
ON learning_paths FOR SELECT
TO public
USING (true);

-- Only admins can manage learning paths
CREATE POLICY "Admins can manage learning paths"
ON learning_paths FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Anyone can read learning path courses
CREATE POLICY "Learning path courses are readable"
ON learning_path_courses FOR SELECT
TO public
USING (true);

-- Only admins can manage learning path courses
CREATE POLICY "Admins can manage learning path courses"
ON learning_path_courses FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);
