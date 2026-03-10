-- Migration 021: Add SMTP email settings for sending emails via one.com
-- Idempotent: safe to re-run

INSERT INTO admin_settings (key, value) VALUES
  ('smtp_host', ''),
  ('smtp_port', '465'),
  ('smtp_user', ''),
  ('smtp_password', ''),
  ('smtp_from_email', ''),
  ('smtp_from_name', 'Shifting Source')
ON CONFLICT (key) DO NOTHING;
