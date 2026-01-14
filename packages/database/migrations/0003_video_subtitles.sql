-- Video Subtitles Schema
-- Added: 2026-01-14

-- =============================================
-- Video Subtitles (字幕)
-- =============================================

CREATE TABLE IF NOT EXISTS el_video_subtitles (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL REFERENCES el_videos(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'ja',
  label TEXT NOT NULL DEFAULT '日本語',
  vtt_url TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_el_video_subtitles_video_id ON el_video_subtitles(video_id);
CREATE INDEX IF NOT EXISTS idx_el_video_subtitles_language ON el_video_subtitles(language);

-- =============================================
-- Course Review Rejection Reason
-- =============================================

-- Add rejection_reason column to courses if not exists
-- Note: SQLite doesn't support IF NOT EXISTS for ALTER TABLE
-- This will fail silently if column already exists
-- In production, use proper migration tools
