-- Migration 019: Add meal plan storage columns to profiles
-- Stores the latest generated meal plan on each user's profile

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS latest_meal_plan TEXT,
ADD COLUMN IF NOT EXISTS meal_plan_generated_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN profiles.latest_meal_plan IS 'Latest AI-generated meal plan (markdown)';
COMMENT ON COLUMN profiles.meal_plan_generated_at IS 'When the latest meal plan was generated';
