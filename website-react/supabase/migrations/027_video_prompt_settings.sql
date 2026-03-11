-- 027: Seed video prompt settings in admin_settings
-- These are configurable via Admin → Settings. Empty = use default prompt from kieai.ts

INSERT INTO admin_settings (key, value) VALUES
  ('video_prompt_article', ''),
  ('video_prompt_recipe', '')
ON CONFLICT (key) DO NOTHING;
