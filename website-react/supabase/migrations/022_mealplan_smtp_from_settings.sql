-- Migration 022: Mealplan-specific SMTP from-email settings
-- Allows sending meal plan emails from a separate address (e.g. meal@shiftingsource.com)

INSERT INTO admin_settings (key, value) VALUES
  ('mealplan_smtp_from_email', ''),
  ('mealplan_smtp_from_name', '')
ON CONFLICT (key) DO NOTHING;
