-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default categories
INSERT INTO categories (name, slug, order_index) VALUES
  ('プログラミング', 'programming', 1),
  ('デザイン', 'design', 2),
  ('マーケティング', 'marketing', 3),
  ('ビジネス', 'business', 4),
  ('データサイエンス', 'data-science', 5),
  ('AI・機械学習', 'ai-ml', 6),
  ('その他', 'other', 99)
ON CONFLICT (name) DO NOTHING;

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY "Categories are publicly readable"
ON categories FOR SELECT
TO public
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories"
ON categories FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
