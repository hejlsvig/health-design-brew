-- Social Media Publisher: Database Schema
-- Tables for connected accounts, publish queue, and publish log

-- 1. Connected social media accounts (OAuth tokens stored encrypted)
CREATE TABLE IF NOT EXISTS social_connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'youtube', 'tiktok')),
  platform_user_id TEXT,              -- Platform-specific user/page ID
  platform_username TEXT,             -- Display name (@handle)
  access_token TEXT NOT NULL,         -- OAuth access token (encrypt in production with pgcrypto)
  refresh_token TEXT,                 -- OAuth refresh token
  token_expires_at TIMESTAMPTZ,       -- When access token expires
  scopes TEXT[],                      -- Granted OAuth scopes
  page_id TEXT,                       -- For Facebook/Instagram: specific page ID
  page_name TEXT,                     -- For Facebook/Instagram: page name
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- 2. Publish queue (posts waiting to be published)
CREATE TABLE IF NOT EXISTS social_publish_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Content
  content_text TEXT,                   -- Post caption/text
  media_urls TEXT[],                   -- Array of media URLs (images/videos)
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'text', 'carousel')),
  -- Target platforms
  platforms TEXT[] NOT NULL,           -- Which platforms to publish to ['instagram', 'facebook']
  -- Scheduling
  scheduled_at TIMESTAMPTZ,           -- NULL = publish immediately
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed')),
  -- Metadata
  article_id UUID,                    -- Optional: linked blog article
  tags TEXT[],                        -- Content tags/hashtags
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- 3. Publish log (result per platform per post)
CREATE TABLE IF NOT EXISTS social_publish_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES social_publish_queue(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES social_connected_accounts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  -- Result
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'rate_limited')),
  platform_post_id TEXT,               -- ID of the created post on the platform
  platform_post_url TEXT,              -- URL to the published post
  error_message TEXT,                  -- Error details if failed
  response_data JSONB,                 -- Full API response for debugging
  -- Timestamps
  attempted_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_connected_accounts(platform, is_active);
CREATE INDEX IF NOT EXISTS idx_social_queue_status ON social_publish_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_social_queue_user ON social_publish_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_social_log_queue ON social_publish_log(queue_id);

-- RLS Policies
ALTER TABLE social_connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_publish_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_publish_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access using existing is_admin() function
CREATE POLICY "Admins can manage social accounts"
  ON social_connected_accounts FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage publish queue"
  ON social_publish_queue FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can view publish logs"
  ON social_publish_log FOR ALL
  USING (is_admin());

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER social_accounts_updated_at
  BEFORE UPDATE ON social_connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER social_queue_updated_at
  BEFORE UPDATE ON social_publish_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
