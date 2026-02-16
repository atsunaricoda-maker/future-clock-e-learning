-- Create course reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

-- Index for course reviews
CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews (course_id, created_at DESC);

-- RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Reviews are publicly readable"
ON reviews FOR SELECT
TO public
USING (true);

-- Authenticated users can create their own review
CREATE POLICY "Users can create own reviews"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own review
CREATE POLICY "Users can update own reviews"
ON reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own review
CREATE POLICY "Users can delete own reviews"
ON reviews FOR DELETE
TO authenticated
USING (user_id = auth.uid());
