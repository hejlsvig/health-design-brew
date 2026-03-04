-- ═══════════════════════════════════════════════════════════════
-- SHIFTING SHOURCE — Admin RLS for Articles + CRM Users setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- ─── Helper: Check if current user is admin ──────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM crm_users
    WHERE id = auth.uid()
    AND role = 'admin'
    AND active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Articles: Admin RLS policies ────────────────────────────
-- Admins can read ALL articles (including drafts & archived)
CREATE POLICY "Admins can view all articles"
    ON articles FOR SELECT
    USING (is_admin());

-- Admins can create articles
CREATE POLICY "Admins can insert articles"
    ON articles FOR INSERT
    WITH CHECK (is_admin());

-- Admins can update articles
CREATE POLICY "Admins can update articles"
    ON articles FOR UPDATE
    USING (is_admin());

-- Admins can delete articles
CREATE POLICY "Admins can delete articles"
    ON articles FOR DELETE
    USING (is_admin());

-- ─── CRM Users: RLS ─────────────────────────────────────────
ALTER TABLE crm_users ENABLE ROW LEVEL SECURITY;

-- CRM users can read their own record
CREATE POLICY "CRM users can view own record"
    ON crm_users FOR SELECT
    USING (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- ADD ANDERS AS ADMIN
-- Run this AFTER logging in (so auth.users entry exists)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO crm_users (id, email, name, role, language, active)
SELECT id, email, 'Anders Hejlsvig', 'admin', 'da', true
FROM auth.users WHERE email = 'ahe@eksido.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin', active = true;
