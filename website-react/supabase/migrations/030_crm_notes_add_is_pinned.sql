-- Add is_pinned column to crm_notes (used by CRM app for pinning important notes)
ALTER TABLE crm_notes ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
