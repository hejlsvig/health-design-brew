-- Migration 023: Coach SMTP credentials
-- Each coach (crm_user) can have their own SMTP password for sending emails
-- to coaching clients (e.g. meal plans). The SMTP host/port are shared (one.com).

-- Add smtp_password column to crm_users
DO $$ BEGIN
  ALTER TABLE crm_users ADD COLUMN smtp_password TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add sender_name column (display name for outgoing emails)
DO $$ BEGIN
  ALTER TABLE crm_users ADD COLUMN sender_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
