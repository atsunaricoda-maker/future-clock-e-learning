-- ============================================
-- 014: 動画視聴追跡（max_watched_seconds）
-- ============================================

-- lesson_progress テーブルに最大視聴到達位置カラムを追加
-- ブラウザ再読み込み時にも早送り制限が効くようにする
ALTER TABLE lesson_progress
ADD COLUMN IF NOT EXISTS max_watched_seconds INTEGER DEFAULT 0;

-- コメント追加
COMMENT ON COLUMN lesson_progress.max_watched_seconds IS '最大視聴到達位置（秒）。シーク制限の復元に使用';
