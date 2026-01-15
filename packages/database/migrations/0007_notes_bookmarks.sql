-- Notes and Bookmarks tables with el_ prefix
-- These tables store user notes and bookmarks for lectures

CREATE TABLE IF NOT EXISTS el_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES el_users(id) ON DELETE CASCADE,
  lecture_id TEXT NOT NULL REFERENCES el_lectures(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp_seconds INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_el_notes_user_id ON el_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_el_notes_lecture_id ON el_notes(lecture_id);
CREATE INDEX IF NOT EXISTS idx_el_notes_user_lecture ON el_notes(user_id, lecture_id);

CREATE TABLE IF NOT EXISTS el_bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES el_users(id) ON DELETE CASCADE,
  lecture_id TEXT NOT NULL REFERENCES el_lectures(id) ON DELETE CASCADE,
  title TEXT,
  timestamp_seconds INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_el_bookmarks_user_id ON el_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_el_bookmarks_lecture_id ON el_bookmarks(lecture_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_el_bookmarks_user_lecture_time ON el_bookmarks(user_id, lecture_id, timestamp_seconds);
