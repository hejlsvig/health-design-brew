-- Migration 012: Feature Gates
-- Controls which features are available per subscription tier

-- ============================================
-- 1. Feature gates table
-- ============================================
CREATE TABLE IF NOT EXISTS feature_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'pro')),
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(feature_key, tier)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_feature_gates_feature_key ON feature_gates(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_gates_tier ON feature_gates(tier);

-- ============================================
-- 2. RLS Policies
-- ============================================
ALTER TABLE feature_gates ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature gates (needed for frontend gating)
CREATE POLICY IF NOT EXISTS "Anyone can read feature gates"
  ON feature_gates FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY IF NOT EXISTS "Admins can manage feature gates"
  ON feature_gates FOR ALL
  USING (is_admin());

-- ============================================
-- 3. Seed feature gates (15 features × 3 tiers)
-- ============================================
INSERT INTO feature_gates (feature_key, tier, is_enabled, description) VALUES
  -- Calculator
  ('basic_calculator',      'free',    true,  'Basic TDEE/BMR calculator'),
  ('basic_calculator',      'premium', true,  'Basic TDEE/BMR calculator'),
  ('basic_calculator',      'pro',     true,  'Basic TDEE/BMR calculator'),
  ('advanced_macros',       'free',    false, 'Advanced macro breakdowns and tracking'),
  ('advanced_macros',       'premium', true,  'Advanced macro breakdowns and tracking'),
  ('advanced_macros',       'pro',     true,  'Advanced macro breakdowns and tracking'),

  -- Recipes
  ('browse_recipes',        'free',    true,  'Browse published recipes'),
  ('browse_recipes',        'premium', true,  'Browse published recipes'),
  ('browse_recipes',        'pro',     true,  'Browse published recipes'),
  ('unlimited_favorites',   'free',    false, 'Save unlimited recipe favorites'),
  ('unlimited_favorites',   'premium', true,  'Save unlimited recipe favorites'),
  ('unlimited_favorites',   'pro',     true,  'Save unlimited recipe favorites'),
  ('favorite_limit',        'free',    true,  'Limited favorites for free tier'),
  ('favorite_limit',        'premium', false, 'Not applicable for premium'),
  ('favorite_limit',        'pro',     false, 'Not applicable for pro'),

  -- AI Features
  ('ai_meal_plans',         'free',    false, 'AI-generated personalized meal plans'),
  ('ai_meal_plans',         'premium', true,  'AI-generated personalized meal plans'),
  ('ai_meal_plans',         'pro',     true,  'AI-generated personalized meal plans'),
  ('ai_chat',               'free',    false, 'AI nutrition chat assistant'),
  ('ai_chat',               'premium', false, 'AI nutrition chat assistant'),
  ('ai_chat',               'pro',     true,  'AI nutrition chat assistant'),
  ('ai_image_generation',   'free',    false, 'AI image generation for content'),
  ('ai_image_generation',   'premium', false, 'AI image generation for content'),
  ('ai_image_generation',   'pro',     true,  'AI image generation for content'),

  -- Content
  ('blog_access',           'free',    true,  'Access to blog articles'),
  ('blog_access',           'premium', true,  'Access to blog articles'),
  ('blog_access',           'pro',     true,  'Access to blog articles'),
  ('research_guides',       'free',    false, 'Access to research guides and deep-dives'),
  ('research_guides',       'premium', true,  'Access to research guides and deep-dives'),
  ('research_guides',       'pro',     true,  'Access to research guides and deep-dives'),

  -- Coaching
  ('coaching_access',       'free',    false, 'Access to coaching program'),
  ('coaching_access',       'premium', false, 'Access to coaching program'),
  ('coaching_access',       'pro',     true,  'Access to coaching program'),
  ('coaching_checkins',     'free',    false, 'Weekly coaching check-ins'),
  ('coaching_checkins',     'premium', false, 'Weekly coaching check-ins'),
  ('coaching_checkins',     'pro',     true,  'Weekly coaching check-ins'),

  -- Profile & Data
  ('data_export',           'free',    true,  'Export personal data (GDPR)'),
  ('data_export',           'premium', true,  'Export personal data (GDPR)'),
  ('data_export',           'pro',     true,  'Export personal data (GDPR)'),
  ('meal_plan_history',     'free',    false, 'View past meal plan history'),
  ('meal_plan_history',     'premium', true,  'View past meal plan history'),
  ('meal_plan_history',     'pro',     true,  'View past meal plan history'),

  -- Limits (config JSONB holds numeric limits)
  ('monthly_meal_plans',    'free',    true,  'Monthly meal plan generation limit'),
  ('monthly_meal_plans',    'premium', true,  'Monthly meal plan generation limit'),
  ('monthly_meal_plans',    'pro',     true,  'Monthly meal plan generation limit')
ON CONFLICT (feature_key, tier) DO NOTHING;

-- Set config for limit-based features
UPDATE feature_gates SET config = '{"limit": 0}' WHERE feature_key = 'monthly_meal_plans' AND tier = 'free';
UPDATE feature_gates SET config = '{"limit": 3}' WHERE feature_key = 'monthly_meal_plans' AND tier = 'premium';
UPDATE feature_gates SET config = '{"limit": -1}' WHERE feature_key = 'monthly_meal_plans' AND tier = 'pro'; -- -1 = unlimited
UPDATE feature_gates SET config = '{"limit": 5}' WHERE feature_key = 'favorite_limit' AND tier = 'free';
