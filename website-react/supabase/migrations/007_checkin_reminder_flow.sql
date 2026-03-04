-- ============================================================
-- 007: Check-in Reminder Flow (revised for existing schema)
-- Adds fields for automated check-in reminder pipeline:
--   1. Check if check-in is overdue
--   2. Send reminder email after grace period
--   3. Auto-pause + flag if still no response
-- ============================================================

-- ── 1. New columns on coaching_clients (some already exist) ──

ALTER TABLE coaching_clients
  ADD COLUMN IF NOT EXISTS reminder_status TEXT DEFAULT 'none';

ALTER TABLE coaching_clients
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ;

ALTER TABLE coaching_clients
  ADD COLUMN IF NOT EXISTS flag_reason TEXT;

ALTER TABLE coaching_clients
  ADD COLUMN IF NOT EXISTS checkin_reminders_enabled BOOLEAN DEFAULT true;

ALTER TABLE coaching_clients
  ADD COLUMN IF NOT EXISTS reminder_frequency_days INTEGER DEFAULT 7;

ALTER TABLE coaching_clients
  ADD COLUMN IF NOT EXISTS last_checkin_reminder_sent TIMESTAMPTZ;

ALTER TABLE coaching_clients
  ADD COLUMN IF NOT EXISTS reminder_grace_days INTEGER DEFAULT 2;

-- Add CHECK constraint for reminder_status if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coaching_clients_reminder_status_check'
  ) THEN
    ALTER TABLE coaching_clients
      ADD CONSTRAINT coaching_clients_reminder_status_check
      CHECK (reminder_status IN ('none', 'reminded', 'flagged'));
  END IF;
END $$;

-- ── 2. Index for efficient flow queries ──
CREATE INDEX IF NOT EXISTS idx_coaching_clients_reminder_status
  ON coaching_clients(reminder_status)
  WHERE status = 'active' AND checkin_reminders_enabled = true;

-- ── 3. Email automation settings table (new) ──
CREATE TABLE IF NOT EXISTS email_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_type TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT false,
  frequency_days INTEGER DEFAULT 7,
  grace_days INTEGER DEFAULT 2,
  auto_pause_enabled BOOLEAN DEFAULT true,
  sender_mode TEXT DEFAULT 'coach',
  custom_from_email TEXT,
  custom_from_name TEXT,
  email_provider TEXT DEFAULT 'resend',
  provider_config JSONB DEFAULT '{}',
  last_run TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the check-in reminder settings row
INSERT INTO email_automation_settings (automation_type, enabled, frequency_days, grace_days, sender_mode, email_provider)
VALUES ('checkin_reminder', false, 7, 2, 'coach', 'resend')
ON CONFLICT (automation_type) DO NOTHING;

-- ── 4. Add missing columns to existing crm_email_log table ──
ALTER TABLE crm_email_log
  ADD COLUMN IF NOT EXISTS coaching_client_id UUID REFERENCES coaching_clients(id) ON DELETE SET NULL;

ALTER TABLE crm_email_log
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE crm_email_log
  ADD COLUMN IF NOT EXISTS email_address TEXT;

ALTER TABLE crm_email_log
  ADD COLUMN IF NOT EXISTS email_type TEXT;

ALTER TABLE crm_email_log
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

ALTER TABLE crm_email_log
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE crm_email_log
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ── 5. Indexes on crm_email_log ──
CREATE INDEX IF NOT EXISTS idx_crm_email_log_type
  ON crm_email_log(email_type);

CREATE INDEX IF NOT EXISTS idx_crm_email_log_client
  ON crm_email_log(coaching_client_id);
