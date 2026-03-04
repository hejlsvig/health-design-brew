-- ============================================
-- Migration 010: Seed security config settings
-- Rate limiting, CSP extra domains
-- ============================================

-- Rate limiting defaults (bruges af rateLimit.ts)
INSERT INTO admin_settings (key, value) VALUES ('rate_limit_max_requests', '5')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO admin_settings (key, value) VALUES ('rate_limit_window_seconds', '60')
  ON CONFLICT (key) DO NOTHING;

-- CSP ekstra domæner (bruges til at verificere .htaccess)
INSERT INTO admin_settings (key, value) VALUES ('csp_extra_domains', '')
  ON CONFLICT (key) DO NOTHING;
