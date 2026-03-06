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

/* ─── Permissions ─── */

export const CRM_SECTIONS = ['leads', 'coaching', 'automation', 'settings', 'analytics', 'emails', 'mealplans'] as const
export type CrmSection = typeof CRM_SECTIONS[number]

export interface CrmPermission {
  id: string
  crm_user_id: string
  section: CrmSection
  can_view: boolean
  can_edit: boolean
}

export async function fetchPermissions(userId: string): Promise<CrmPermission[]> {
  const { data, error } = await supabase
    .from('crm_user_permissions')
    .select('*')
    .eq('crm_user_id', userId)

  if (error) throw error
  return (data || []) as CrmPermission[]
}

export async function fetchAllPermissions(): Promise<CrmPermission[]> {
  const { data, error } = await supabase
    .from('crm_user_permissions')
    .select('*')

  if (error) throw error
  return (data || []) as CrmPermission[]
}

export async function upsertPermission(userId: string, section: CrmSection, canView: boolean, canEdit: boolean): Promise<void> {
  const { error } = await supabase
    .from('crm_user_permissions')
    .upsert({
      crm_user_id: userId,
      section,
      can_view: canView,
      can_edit: canEdit,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'crm_user_id,section' })

  if (error) throw error
}

export async function setDefaultPermissions(userId: string, role: CrmRole): Promise<void> {
  const perms = CRM_SECTIONS.map((section) => ({
    crm_user_id: userId,
    section,
    can_view: role === 'admin' || role === 'medium',
    can_edit: role === 'admin',
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('crm_user_permissions')
    .upsert(perms, { onConflict: 'crm_user_id,section' })

  if (error) throw error
}

/* ─── Create User ─── */

export async function createCrmUser(userData: {
  email: string; name: string; role: CrmRole; language: string; sender_email?: string
}): Promise<CrmUserRow> {
  // First invite user via Supabase auth (sends magic link)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: userData.email,
    email_confirm: true,
  })

  if (authError) {
    // User may already exist in auth — try to find them
    const { data: existingUsers } = await supabase
      .from('crm_users')
      .select('id')
      .eq('email', userData.email)
      .limit(1)

    if (existingUsers && existingUsers.length > 0) {
      throw new Error('Bruger med denne email eksisterer allerede i CRM')
    }

    // If auth user exists but not in crm_users, we need the auth id
    // For now, fall back to using the email to look up auth.users
    throw new Error(`Kunne ikke oprette auth-bruger: ${authError.message}`)
  }

  const authId = authData.user?.id
  if (!authId) throw new Error('Ingen bruger-ID returneret fra auth')

  // Insert into crm_users
  const { data, error } = await supabase
    .from('crm_users')
    .insert({
      id: authId,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      language: userData.language,
      sender_email: userData.sender_email || null,
      active: true,
    })
    .select()
    .single()

  if (error) throw error

  // Set default permissions based on role
  await setDefaultPermissions(authId, userData.role)

  return data as CrmUserRow
}
