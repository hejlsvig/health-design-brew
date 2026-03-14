-- Migration 029: Restore lead_status → profiles FK for PostgREST joins
--
-- Migration 028 dropped lead_status_user_id_profiles_fkey which broke
-- PostgREST auto-joins used by fetchLeads() in crm.ts.
-- This restores the FK with NOT VALID to skip validation of existing
-- rows (some have NULL user_id after 028 made it nullable).

ALTER TABLE lead_status
  ADD CONSTRAINT lead_status_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
  NOT VALID;
