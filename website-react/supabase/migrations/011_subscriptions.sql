-- Migration 011: Subscriptions & Tier System
-- Adds subscription management for freemium/paid model (Free / Premium / Pro)

-- ============================================
-- 1. Subscriptions table
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_profile_id ON subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. RLS Policies
-- ============================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY IF NOT EXISTS "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = profile_id);

-- Admins can do everything
CREATE POLICY IF NOT EXISTS "Admins have full access to subscriptions"
  ON subscriptions FOR ALL
  USING (is_admin());

-- ============================================
-- 3. Auto-create free subscription for new profiles
-- ============================================
CREATE OR REPLACE FUNCTION create_subscription_for_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (profile_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_create_subscription ON profiles;
CREATE TRIGGER auto_create_subscription
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_subscription_for_new_profile();

-- ============================================
-- 4. Backfill: Create free subscriptions for existing profiles
-- ============================================
INSERT INTO subscriptions (profile_id, tier, status)
SELECT id, 'free', 'active'
FROM profiles
WHERE id NOT IN (SELECT profile_id FROM subscriptions)
ON CONFLICT (profile_id) DO NOTHING;

-- ============================================
-- 5. Admin settings for Stripe (keys stored here, not in code)
-- ============================================
INSERT INTO admin_settings (key, value) VALUES
  ('stripe_publishable_key', ''),
  ('stripe_secret_key', ''),
  ('stripe_webhook_secret', ''),
  ('stripe_premium_price_id', ''),
  ('stripe_pro_price_id', '')
ON CONFLICT (key) DO NOTHING;
