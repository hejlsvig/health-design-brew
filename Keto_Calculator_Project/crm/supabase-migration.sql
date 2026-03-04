-- ============================================================
-- CRM Supabase Migration: Missing Tables + FK Fixes
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add FK from crm_users.profile_id → profiles.id
-- (The constraint name MUST match what supabase-api.js references)
ALTER TABLE public.crm_users
  ADD CONSTRAINT crm_users_profile_id_fkey
  FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- 2. Create crm_notes table
CREATE TABLE IF NOT EXISTS public.crm_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT DEFAULT 'general',  -- 'general', 'madplan', 'klient'
  priority TEXT DEFAULT 'medium',    -- 'low', 'medium', 'high'
  lead_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create crm_settings table
CREATE TABLE IF NOT EXISTS public.crm_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create crm_email_log table
CREATE TABLE IF NOT EXISTS public.crm_email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  to_address TEXT NOT NULL,
  subject TEXT,
  message TEXT,
  template_id UUID,
  sent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'sent', 'failed'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create meal_plans table (if not exists)
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_data JSONB,
  total_cost NUMERIC(10,2) DEFAULT 0,
  model_used TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS Policies — allow CRM admins to manage these tables
-- ============================================================

-- Enable RLS on new tables
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_email_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

-- Helper: reuse existing is_crm_admin() function
-- (Already created in previous migration)

-- crm_notes policies
CREATE POLICY "CRM admins can read notes"
  ON public.crm_notes FOR SELECT
  USING (public.is_crm_admin());

CREATE POLICY "CRM admins can insert notes"
  ON public.crm_notes FOR INSERT
  WITH CHECK (public.is_crm_admin());

CREATE POLICY "CRM admins can update notes"
  ON public.crm_notes FOR UPDATE
  USING (public.is_crm_admin());

CREATE POLICY "CRM admins can delete notes"
  ON public.crm_notes FOR DELETE
  USING (public.is_crm_admin());

-- crm_settings policies
CREATE POLICY "CRM admins can read settings"
  ON public.crm_settings FOR SELECT
  USING (public.is_crm_admin());

CREATE POLICY "CRM admins can insert settings"
  ON public.crm_settings FOR INSERT
  WITH CHECK (public.is_crm_admin());

CREATE POLICY "CRM admins can update settings"
  ON public.crm_settings FOR UPDATE
  USING (public.is_crm_admin());

-- crm_email_log policies
CREATE POLICY "CRM admins can read email log"
  ON public.crm_email_log FOR SELECT
  USING (public.is_crm_admin());

CREATE POLICY "CRM admins can insert email log"
  ON public.crm_email_log FOR INSERT
  WITH CHECK (public.is_crm_admin());

-- meal_plans policies
CREATE POLICY "CRM admins can read meal plans"
  ON public.meal_plans FOR SELECT
  USING (public.is_crm_admin());

CREATE POLICY "CRM admins can insert meal plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (public.is_crm_admin());

CREATE POLICY "Users can read own meal plans"
  ON public.meal_plans FOR SELECT
  USING (auth.uid() = profile_id);

-- ============================================================
-- Notify PostgREST to reload schema cache
-- ============================================================
NOTIFY pgrst, 'reload schema';
