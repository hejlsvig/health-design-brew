-- ============================================
-- Migration 017: Fix prep_time CHECK constraint
-- The calculator UI uses 'long' and 'mix' but the DB
-- constraint only allowed 'quick', 'medium', 'elaborate'.
-- This caused the "Indsend" submit to fail silently.
-- ============================================

-- Drop the old constraint and add updated one
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_prep_time_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_prep_time_check
  CHECK (prep_time IN ('quick', 'medium', 'long', 'mix', 'elaborate'));

-- Update any existing 'elaborate' values to 'long' for consistency
UPDATE profiles SET prep_time = 'long' WHERE prep_time = 'elaborate';
