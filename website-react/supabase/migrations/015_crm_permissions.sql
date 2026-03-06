-- Migration 015: CRM User Permissions
-- Granular section-based permissions for CRM users

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

-- RLS
ALTER TABLE crm_user_permissions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins can manage permissions"
    ON crm_user_permissions FOR ALL
    USING (EXISTS (SELECT 1 FROM crm_users WHERE id = auth.uid() AND role = 'admin' AND active = true));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Auto-update trigger
CREATE OR REPLACE TRIGGER set_updated_at_crm_user_permissions
  BEFORE UPDATE ON crm_user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- Seed: give all existing admin users full permissions
INSERT INTO crm_user_permissions (crm_user_id, section, can_view, can_edit)
SELECT u.id, s.section, true, true
FROM crm_users u
CROSS JOIN (
  VALUES ('leads'), ('coaching'), ('automation'), ('settings'), ('analytics'), ('emails'), ('mealplans')
) AS s(section)
WHERE u.role = 'admin'
ON CONFLICT (crm_user_id, section) DO NOTHING;

-- Add sender_email to crm_users if not exists
DO $$ BEGIN
  ALTER TABLE crm_users ADD COLUMN sender_email TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
