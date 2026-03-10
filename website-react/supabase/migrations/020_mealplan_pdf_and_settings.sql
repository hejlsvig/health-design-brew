-- Migration 020: Add meal_plan_pdf_url to profiles + mealplan-specific AI settings
-- Idempotent: safe to re-run

-- 1. Add PDF URL column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS meal_plan_pdf_url TEXT;

-- 2. Add mealplan-specific AI settings (separate from article generation)
INSERT INTO admin_settings (key, value) VALUES
  ('mealplan_openai_api_key', ''),
  ('mealplan_ai_model', '')
ON CONFLICT (key) DO NOTHING;

-- 3. Add meal_plan_generated activity type if not already supported
-- (lead_activity.activity_type is TEXT, no enum constraint needed)
