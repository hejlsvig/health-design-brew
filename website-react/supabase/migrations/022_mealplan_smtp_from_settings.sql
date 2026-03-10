-- Migration 022: Mealplan-specific SMTP settings
-- Separate SMTP account for sending meal plans (e.g. meal@shiftingsource.com)

INSERT INTO admin_settings (key, value) VALUES
  ('mealplan_smtp_host', ''),
  ('mealplan_smtp_port', '465'),
  ('mealplan_smtp_user', ''),
  ('mealplan_smtp_password', ''),
  ('mealplan_smtp_from_email', ''),
  ('mealplan_smtp_from_name', '')
ON CONFLICT (key) DO NOTHING;
