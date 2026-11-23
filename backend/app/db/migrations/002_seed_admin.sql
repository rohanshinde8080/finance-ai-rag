-- ====================================================================
-- Migration: 002_seed_admin.sql
-- Description: Ensures admin role validation and metadata structure
-- ====================================================================

-- Verify that the role check constraint exists and is enforced
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
    END IF;
END $$;

