-- ═══════════════════════════════════════════════════════════════
-- SHIFTING SOURCE — CRM Integration, Consent & Newsletter
-- Migration 006: New CRM tables + consent fields + RLS
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. EXTEND PROFILES with consent & CRM fields ───────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS newsletter_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS coaching_contact_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS email_frequency_preference TEXT DEFAULT 'weekly'
    CHECK (email_frequency_preference IN ('daily', 'weekly', 'monthly', 'never'));

-- Also relax the source CHECK to allow 'imported' and 'newsletter'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_source_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_source_check
  CHECK (source IN ('calculator', 'website_signup', 'manual', 'imported', 'newsletter'));

-- ─── 2. CONSENT_LOG — GDPR Audit Trail ──────────────────────

CREATE TABLE IF NOT EXISTS consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscriber_id UUID,  -- FK to newsletter_subscribers for non-auth users
  consent_type TEXT NOT NULL
    CHECK (consent_type IN (
      'data_processing', 'marketing_email', 'newsletter',
      'coaching_contact', 'gdpr_accept', 'third_party'
    )),
  granted BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  source TEXT NOT NULL DEFAULT 'unknown'
    CHECK (source IN (
      'calculator', 'footer_form', 'profile_settings',
      'admin_override', 'signup', 'imported', 'unknown'
    )),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user ON consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_subscriber ON consent_log(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_type ON consent_log(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_log_created ON consent_log(created_at);

-- ─── 3. NEWSLETTER_SUBSCRIBERS — Non-authenticated signups ──

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'footer_form'
    CHECK (source IN ('footer_form', 'popup', 'imported', 'manual')),
  linked_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  language TEXT DEFAULT 'da' CHECK (language IN ('da', 'se', 'en')),
  ip_address TEXT,
  user_agent TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_linked ON newsletter_subscribers(linked_user_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(is_active);

CREATE TRIGGER newsletter_subscribers_updated_at
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 4. LEAD_STATUS — Pipeline Tracking ─────────────────────

CREATE TABLE IF NOT EXISTS lead_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  source TEXT NOT NULL DEFAULT 'website_signup'
    CHECK (source IN (
      'calculator', 'newsletter', 'website_signup', 'manual', 'imported'
    )),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN (
      'new', 'contacted', 'qualified', 'coaching_active',
      'coaching_paused', 'coaching_completed', 'inactive', 'opted_out'
    )),
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  assigned_to UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  first_contact_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  follow_up_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_user ON lead_status(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_status_status ON lead_status(status);
CREATE INDEX IF NOT EXISTS idx_lead_status_source ON lead_status(source);
CREATE INDEX IF NOT EXISTS idx_lead_status_assigned ON lead_status(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_status_followup ON lead_status(follow_up_date);

CREATE TRIGGER lead_status_updated_at
  BEFORE UPDATE ON lead_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 5. LEAD_ACTIVITY — Interaction Timeline ────────────────

CREATE TABLE IF NOT EXISTS lead_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL
    CHECK (activity_type IN (
      'signup', 'calculator_completed', 'newsletter_subscribed',
      'profile_updated', 'recipe_saved', 'email_sent', 'email_opened',
      'check_in_submitted', 'coaching_activated', 'coaching_paused',
      'coaching_completed', 'note_added', 'status_changed',
      'consent_changed', 'data_exported', 'account_deleted'
    )),
  activity_details JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_activity_user ON lead_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_type ON lead_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activity_created ON lead_activity(created_at);

-- ─── 6. EMAIL_TEMPLATES — Reusable templates ────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_type TEXT NOT NULL
    CHECK (email_type IN (
      'newsletter', 'check_in_reminder', 'coaching_welcome',
      'coaching_followup', 'welcome', 'data_export', 'custom'
    )),
  subject JSONB NOT NULL DEFAULT '{"da":"","en":"","se":""}'::jsonb,
  body_html JSONB NOT NULL DEFAULT '{"da":"","en":"","se":""}'::jsonb,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 7. EMAIL_SENDS — Email audit log ───────────────────────

CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_address TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'failed')),
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounce_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_type ON email_sends(email_type);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);

-- ─── 8. EXTEND COACHING_CLIENTS with payment fields ─────────

ALTER TABLE coaching_clients
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none'
    CHECK (payment_status IN ('none', 'pending', 'active', 'overdue', 'cancelled', 'completed')),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS coaching_package TEXT,
  ADD COLUMN IF NOT EXISTS check_in_frequency TEXT DEFAULT 'weekly'
    CHECK (check_in_frequency IN ('weekly', 'biweekly', 'monthly'));

-- ─── 9. ROW LEVEL SECURITY ──────────────────────────────────

-- consent_log: users see own, admins see all
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent log"
  ON consent_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent"
  ON consent_log FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all consent logs"
  ON consent_log FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage consent logs"
  ON consent_log FOR ALL
  USING (is_admin());

-- newsletter_subscribers: admins + service role only
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage newsletter subscribers"
  ON newsletter_subscribers FOR ALL
  USING (is_admin());

CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);

-- lead_status: admins only (+ users can see own)
ALTER TABLE lead_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lead status"
  ON lead_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all lead status"
  ON lead_status FOR ALL
  USING (is_admin());

-- lead_activity: admins only (+ users can see own)
ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON lead_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert activity for self"
  ON lead_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all activity"
  ON lead_activity FOR ALL
  USING (is_admin());

-- email_templates: admins only
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  USING (is_admin());

-- email_sends: admins only
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email sends"
  ON email_sends FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view own email sends"
  ON email_sends FOR SELECT
  USING (auth.uid() = user_id);

-- ─── 10. AUTO-CREATE lead_status on profile creation ────────

CREATE OR REPLACE FUNCTION create_lead_status_for_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_status (user_id, source, status, lead_score)
  VALUES (
    NEW.id,
    COALESCE(NEW.source, 'website_signup'),
    'new',
    CASE
      WHEN NEW.tdee IS NOT NULL THEN 50  -- completed calculator
      WHEN NEW.name IS NOT NULL THEN 20  -- has name
      ELSE 10                             -- minimal profile
    END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER auto_create_lead_status
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_lead_status_for_new_profile();

-- ─── DONE ────────────────────────────────────────────────────
-- Run this migration in Supabase SQL Editor.
-- Then continue with the React frontend changes.
