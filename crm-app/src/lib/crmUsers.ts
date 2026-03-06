import { supabase } from './supabase'

export type CrmRole = 'light' | 'medium' | 'admin'

export interface CrmUserRow {
  id: string
  email: string
  name: string | null
  role: CrmRole
  language: string
  active: boolean
  email_footer: string | null
  email_logo: string | null
  created_at: string
  updated_at: string
}

export async function fetchCrmUsers(): Promise<CrmUserRow[]> {
  const { data, error } = await supabase
    .from('crm_users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as CrmUserRow[]
}

export async function updateCrmUser(userId: string, updates: Partial<CrmUserRow>): Promise<void> {
  const { error } = await supabase
    .from('crm_users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
}

export async function toggleCrmUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('crm_users')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error
}

export const ROLE_LABELS: Record<CrmRole, string> = {
  light: 'View Only',
  medium: 'Editor',
  admin: 'Administrator',
}

export const ROLE_COLORS: Record<CrmRole, string> = {
  light: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
}
