-- Admin settings table (key-value store for admin config)
CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS: only admins can read/write settings
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view settings"
  ON admin_settings FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert settings"
  ON admin_settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update settings"
  ON admin_settings FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete settings"
  ON admin_settings FOR DELETE
  USING (is_admin());

-- Insert default settings
INSERT INTO admin_settings (key, value) VALUES
  ('openai_api_key', ''),
  ('ai_model', 'gpt-4.1')
ON CONFLICT (key) DO NOTHING;
