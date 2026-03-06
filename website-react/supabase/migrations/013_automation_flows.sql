-- Migration 013: Automation Flows & CRM Notes
-- Visual flow builder for email automations + internal CRM notes

-- ============================================
-- 1. Automation Flows
-- ============================================
CREATE TABLE IF NOT EXISTS automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'on_signup', 'on_coaching_activate', 'on_checkin_missed',
    'on_tier_change', 'on_date', 'manual'
  )),
  trigger_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT false,
  created_by UUID REFERENCES crm_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_flows_enabled ON automation_flows(enabled);
CREATE INDEX IF NOT EXISTS idx_automation_flows_trigger ON automation_flows(trigger_type);

DROP TRIGGER IF EXISTS update_automation_flows_updated_at ON automation_flows;
CREATE TRIGGER update_automation_flows_updated_at
  BEFORE UPDATE ON automation_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 2. Automation Flow Steps
-- ============================================
CREATE TABLE IF NOT EXISTS automation_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN (
    'trigger', 'condition', 'action', 'delay', 'branch'
  )),
  label TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  on_true_step_id UUID,
  on_false_step_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_steps_flow_id ON automation_flow_steps(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_steps_order ON automation_flow_steps(flow_id, step_order);

-- ============================================
-- 3. Automation Flow Runs (execution log)
-- ============================================
CREATE TABLE IF NOT EXISTS automation_flow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES automation_flows(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'skipped'
  )),
  current_step_id UUID,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_runs_flow_id ON automation_flow_runs(flow_id);
CREATE INDEX IF NOT EXISTS idx_flow_runs_status ON automation_flow_runs(status);
CREATE INDEX IF NOT EXISTS idx_flow_runs_user ON automation_flow_runs(target_user_id);

-- ============================================
-- 4. CRM Notes (internal notes, separate from lead_activity)
-- ============================================
CREATE TABLE IF NOT EXISTS crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES crm_users(id),
  title TEXT,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN (
    'general', 'coaching', 'sales', 'support', 'internal', 'followup'
  )),
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_user ON crm_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_notes_created_by ON crm_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_notes_category ON crm_notes(category);

DROP TRIGGER IF EXISTS update_crm_notes_updated_at ON crm_notes;
CREATE TRIGGER update_crm_notes_updated_at
  BEFORE UPDATE ON crm_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. RLS Policies
-- ============================================
ALTER TABLE automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_flow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Admins manage automation_flows"
  ON automation_flows FOR ALL USING (is_admin());

CREATE POLICY IF NOT EXISTS "Admins manage automation_flow_steps"
  ON automation_flow_steps FOR ALL USING (is_admin());

CREATE POLICY IF NOT EXISTS "Admins manage automation_flow_runs"
  ON automation_flow_runs FOR ALL USING (is_admin());

CREATE POLICY IF NOT EXISTS "Admins manage crm_notes"
  ON crm_notes FOR ALL USING (is_admin());

-- ============================================
-- 6. Seed: Example automation flows
-- ============================================
INSERT INTO automation_flows (name, description, trigger_type, trigger_config, enabled) VALUES
  (
    'Welcome New Signup',
    'Sends a welcome email when a new user signs up',
    'on_signup',
    '{}',
    false
  ),
  (
    'Coaching Welcome Flow',
    'Welcome sequence when coaching is activated: welcome email + check-in reminder setup',
    'on_coaching_activate',
    '{}',
    false
  ),
  (
    'Missed Check-in Reminder',
    'Sends a reminder if coaching client misses their weekly check-in',
    'on_checkin_missed',
    '{"grace_days": 2}',
    false
  ),
  (
    'Upgrade Nudge',
    'Sends an upgrade suggestion when a free user has been active for 14 days',
    'on_date',
    '{"days_after_signup": 14, "require_tier": "free"}',
    false
  )
ON CONFLICT DO NOTHING;

-- Seed steps for "Welcome New Signup" flow
DO $$
DECLARE
  flow_id UUID;
BEGIN
  SELECT id INTO flow_id FROM automation_flows WHERE name = 'Welcome New Signup' LIMIT 1;
  IF flow_id IS NOT NULL THEN
    INSERT INTO automation_flow_steps (flow_id, step_order, node_type, label, config) VALUES
      (flow_id, 1, 'trigger', 'User Signs Up', '{"event": "on_signup"}'),
      (flow_id, 2, 'delay', 'Wait 5 minutes', '{"value": 5, "unit": "minutes"}'),
      (flow_id, 3, 'action', 'Send Welcome Email', '{"type": "send_email", "template": "welcome", "use_user_language": true}'),
      (flow_id, 4, 'delay', 'Wait 3 days', '{"value": 3, "unit": "days"}'),
      (flow_id, 5, 'condition', 'Has used calculator?', '{"type": "check_activity", "activity_type": "calculator_completed"}'),
      (flow_id, 6, 'action', 'Send Calculator Reminder', '{"type": "send_email", "template": "calculator_reminder"}')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Seed steps for "Coaching Welcome Flow"
DO $$
DECLARE
  flow_id UUID;
BEGIN
  SELECT id INTO flow_id FROM automation_flows WHERE name = 'Coaching Welcome Flow' LIMIT 1;
  IF flow_id IS NOT NULL THEN
    INSERT INTO automation_flow_steps (flow_id, step_order, node_type, label, config) VALUES
      (flow_id, 1, 'trigger', 'Coaching Activated', '{"event": "on_coaching_activate"}'),
      (flow_id, 2, 'action', 'Send Coaching Welcome', '{"type": "send_email", "template": "coaching_welcome", "use_user_language": true}'),
      (flow_id, 3, 'delay', 'Wait 1 hour', '{"value": 1, "unit": "hours"}'),
      (flow_id, 4, 'action', 'Log Activity', '{"type": "create_activity", "activity_type": "coaching_activated"}'),
      (flow_id, 5, 'delay', 'Wait until first check-in', '{"value": 7, "unit": "days"}'),
      (flow_id, 6, 'condition', 'Check-in submitted?', '{"type": "check_activity", "activity_type": "check_in_submitted"}'),
      (flow_id, 7, 'action', 'Send Check-in Reminder', '{"type": "send_email", "template": "checkin_reminder"}')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
