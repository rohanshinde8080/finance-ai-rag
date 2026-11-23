-- ====================================================================
-- Migration: 003_add_user_profile_fields.sql
-- Description: Add gender, mobile_number, and date_of_birth to users table
-- ====================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS date_of_birth DATE;
