-- Fix: Create is_crm_admin() function as alias for is_admin()
-- Required by: crm_notes, crm_settings, crm_email_log RLS policies
-- These tables reference is_crm_admin() but only is_admin() was defined.

CREATE OR REPLACE FUNCTION is_crm_admin()
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

-- Also ensure crm_users table has proper RLS for admin management
-- Currently only SELECT policy exists; admins need INSERT/UPDATE for user management.

DO $$
BEGIN
  -- Allow admins to update crm_users (manage roles, activate/deactivate)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage crm_users' AND tablename = 'crm_users'
  ) THEN
    EXECUTE 'CREATE POLICY "Admins can manage crm_users" ON crm_users FOR ALL USING (is_admin()) WITH CHECK (is_admin())';
  END IF;
END $$;
