-- Course prerequisites junction table
CREATE TABLE IF NOT EXISTS course_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  prerequisite_course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (course_id, prerequisite_course_id),
  CHECK (course_id != prerequisite_course_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_course ON course_prerequisites (course_id);
CREATE INDEX IF NOT EXISTS idx_course_prerequisites_prereq ON course_prerequisites (prerequisite_course_id);

-- RLS
ALTER TABLE course_prerequisites ENABLE ROW LEVEL SECURITY;

-- Anyone can read prerequisites
CREATE POLICY "Prerequisites are publicly readable"
ON course_prerequisites FOR SELECT
TO public
USING (true);

-- Only admins can manage prerequisites
CREATE POLICY "Admins can manage prerequisites"
ON course_prerequisites FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);
