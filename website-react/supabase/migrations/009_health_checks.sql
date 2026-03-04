-- ============================================
-- 009: Health Checks table for automated monitoring
-- ============================================

CREATE TABLE IF NOT EXISTS health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  overall_status TEXT NOT NULL DEFAULT 'ok', -- 'ok', 'warning', 'error'
  checks JSONB NOT NULL DEFAULT '[]',
  -- Each check: { name, status: 'pass'|'warn'|'fail', detail, checked_at }
  failures INTEGER NOT NULL DEFAULT 0,
  warnings INTEGER NOT NULL DEFAULT 0,
  total_checks INTEGER NOT NULL DEFAULT 0,
  notification_sent BOOLEAN DEFAULT false,
  notification_error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick lookup of latest check
CREATE INDEX idx_health_checks_run_at ON health_checks (run_at DESC);

-- RLS: only admins can read health checks
ALTER TABLE health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read health_checks"
  ON health_checks FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert health_checks"
  ON health_checks FOR INSERT
  WITH CHECK (true);

-- Helper function: check RLS status on all public tables
CREATE OR REPLACE FUNCTION check_rls_status()
RETURNS TABLE(table_name TEXT, rls_enabled BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT AS table_name,
    c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'  -- only regular tables
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE '_%;'
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin notification email to settings if not exists
INSERT INTO admin_settings (key, value)
VALUES ('admin_notification_email', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO admin_settings (key, value)
VALUES ('health_check_enabled', 'true')
ON CONFLICT (key) DO NOTHING;
