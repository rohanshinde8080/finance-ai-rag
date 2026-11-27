-- Migration 004: Allow general feedback and support inquiries without requiring a chat message_id

-- 1. Make message_id nullable
ALTER TABLE feedback ALTER COLUMN message_id DROP NOT NULL;

-- 2. Expand rating check to support 0 (Neutral / General Inquiry)
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_rating_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_rating_check CHECK (rating IN (1, -1, 0));
