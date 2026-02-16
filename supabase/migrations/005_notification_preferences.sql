-- Add notification preferences column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_enrollment": true, "email_lesson_complete": false, "email_quiz_result": false, "email_certificate": true}'::jsonb;
