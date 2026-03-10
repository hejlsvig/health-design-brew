-- Migration 024: Coach assignment for coaching clients
-- Adds coach_id to coaching_clients so each client has an assigned coach.
-- The coach is a crm_user who is responsible for the client and sends emails from their own SMTP.

-- Add coach_id column
DO $$ BEGIN
  ALTER TABLE coaching_clients ADD COLUMN coach_id UUID REFERENCES crm_users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_coaching_clients_coach_id ON coaching_clients(coach_id);

-- Also ensure crm_user_permissions table exists (was in migration 015 but may not have been run)
CREATE TABLE IF NOT EXISTS crm_user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_user_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('leads', 'coaching', 'automation', 'settings', 'analytics', 'emails', 'mealplans')),
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crm_user_id, section)
);

ALTER TABLE crm_user_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "CRM admins can manage permissions"
    ON crm_user_permissions FOR ALL
    USING (is_crm_admin()) WITH CHECK (is_crm_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Seed permissions for existing admin users
INSERT INTO crm_user_permissions (crm_user_id, section, can_view, can_edit)
SELECT cu.id, s.section, true, true
FROM crm_users cu
CROSS JOIN (
  VALUES ('leads'), ('coaching'), ('automation'), ('settings'), ('analytics'), ('emails'), ('mealplans')
) AS s(section)
WHERE cu.role = 'admin'
ON CONFLICT (crm_user_id, section) DO NOTHING;
