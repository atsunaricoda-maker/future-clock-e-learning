-- Add rejection_reason column to el_courses table
-- This allows instructors to see why their course was rejected during review

ALTER TABLE el_courses ADD COLUMN rejection_reason TEXT;
