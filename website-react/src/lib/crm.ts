/**
 * CRM queries & utilities for Shifting Source admin panel.
 * All functions expect the caller to be an admin (RLS enforced).
 */
import { supabase } from './supabase'

// ─── Types ───────────────────────────────────────────────────
export type LeadStatusValue =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'coaching_active'
  | 'coaching_paused'
  | 'coaching_completed'
  | 'inactive'
  | 'opted_out'

export type LeadSource = 'calculator' | 'newsletter' | 'website_signup' | 'manual' | 'imported'

export interface LeadRow {
  user_id: string
  source: LeadSource
  status: LeadStatusValue
  lead_score: number
  assigned_to: string | null
  first_contact_date: string | null
  last_contact_date: string | null
  follow_up_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined profile fields
  profile?: {
    email: string
    name: string | null
    language: string
    daily_calories: number | null
    tdee: number | null
    newsletter_consent: boolean
    marketing_consent: boolean
    coaching_contact_consent: boolean
    created_at: string
  }
}

export interface LeadActivity {
  id: string
  user_id: string
  activity_type: string
  activity_details: Record<string, unknown>
  created_by: string | null
  notes: string | null
  created_at: string
}

export interface CrmStats {
  totalLeads: number
  newThisWeek: number
  qualified: number
  activeCoaching: number
}

// ─── Queries ─────────────────────────────────────────────────

/** Fetch all leads with their profile data for the CRM list */
export async function fetchLeads(filters?: {
  status?: LeadStatusValue
  source?: LeadSource
  search?: string
}) {
  let query = supabase
    .from('lead_status')
    .select(`
      *,
      profile:profiles (
        email, name, language, daily_calories, tdee,
        newsletter_consent, marketing_consent, coaching_contact_consent,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.source) {
    query = query.eq('source', filters.source)
  }

  const { data, error } = await query

  if (error) throw error

  // Client-side search filter (Supabase doesn't join-filter easily)
  let results = data || []
  if (filters?.search) {
    const s = filters.search.toLowerCase()
    results = results.filter((r: any) => {
      const p = r.profile
      return (
        p?.email?.toLowerCase().includes(s) ||
        p?.name?.toLowerCase().includes(s)
      )
    })
  }

  return results
}

/** Fetch a single lead with full profile, consent log, and activity timeline */
export async function fetchLeadDetail(userId: string) {
  const [leadRes, profileRes, consentRes, activityRes, coachingRes] = await Promise.all([
    supabase.from('lead_status').select('*').eq('user_id', userId).single(),
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('consent_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('lead_activity')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('coaching_clients')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })
      .limit(1),
  ])

  return {
    lead: leadRes.data,
    profile: profileRes.data,
    consentLog: consentRes.data || [],
    activityLog: activityRes.data || [],
    coaching: coachingRes.data?.[0] || null,
  }
}

/** Get CRM dashboard stats */
export async function fetchCrmStats(): Promise<CrmStats> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalRes, newRes, qualifiedRes, coachingRes] = await Promise.all([
    supabase.from('lead_status').select('id', { count: 'exact', head: true }),
    supabase.from('lead_status').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('lead_status').select('id', { count: 'exact', head: true }).eq('status', 'qualified'),
    supabase.from('lead_status').select('id', { count: 'exact', head: true }).eq('status', 'coaching_active'),
  ])

  return {
    totalLeads: totalRes.count || 0,
    newThisWeek: newRes.count || 0,
    qualified: qualifiedRes.count || 0,
    activeCoaching: coachingRes.count || 0,
  }
}

// ─── Mutations ───────────────────────────────────────────────

/** Update lead status and log the change */
export async function updateLeadStatus(
  userId: string,
  newStatus: LeadStatusValue,
  adminId?: string,
  notes?: string
) {
  const { error } = await supabase
    .from('lead_status')
    .update({
      status: newStatus,
      last_contact_date: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw error

  // Log activity
  await supabase.from('lead_activity').insert({
    user_id: userId,
    activity_type: 'status_changed',
    activity_details: { new_status: newStatus },
    created_by: adminId || null,
    notes: notes || null,
  })
}

/** Update lead score */
export async function updateLeadScore(userId: string, score: number) {
  const { error } = await supabase
    .from('lead_status')
    .update({ lead_score: Math.max(0, Math.min(100, score)) })
    .eq('user_id', userId)
  if (error) throw error
}

/** Add a note to the activity timeline */
export async function addLeadNote(userId: string, note: string, adminId?: string) {
  const { error } = await supabase.from('lead_activity').insert({
    user_id: userId,
    activity_type: 'note_added',
    activity_details: {},
    created_by: adminId || null,
    notes: note,
  })
  if (error) throw error
}

/** Activate coaching for a lead */
export async function activateCoaching(
  userId: string,
  opts: {
    adminId?: string
    checkInFrequency?: 'weekly' | 'biweekly' | 'monthly'
    notes?: string
  } = {}
) {
  // Check if coaching_client already exists
  const { data: existing } = await supabase
    .from('coaching_clients')
    .select('id, status')
    .eq('profile_id', userId)
    .limit(1)

  if (existing && existing.length > 0) {
    // Reactivate
    await supabase
      .from('coaching_clients')
      .update({
        status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        check_in_frequency: opts.checkInFrequency || 'weekly',
        notes: opts.notes || null,
      })
      .eq('id', existing[0].id)
  } else {
    // Create new
    await supabase.from('coaching_clients').insert({
      profile_id: userId,
      status: 'active',
      check_in_frequency: opts.checkInFrequency || 'weekly',
      notes: opts.notes || null,
    })
  }

  // Update lead status
  await updateLeadStatus(userId, 'coaching_active', opts.adminId, 'Coaching activated')

  // Update profile type
  await supabase
    .from('profiles')
    .update({ profile_type: 'coaching' })
    .eq('id', userId)

  // Log activity
  await supabase.from('lead_activity').insert({
    user_id: userId,
    activity_type: 'coaching_activated',
    activity_details: { frequency: opts.checkInFrequency || 'weekly' },
    created_by: opts.adminId || null,
  })
}

/** Set follow-up date for a lead */
export async function setFollowUp(userId: string, date: string) {
  const { error } = await supabase
    .from('lead_status')
    .update({ follow_up_date: date })
    .eq('user_id', userId)
  if (error) throw error
}

// ─── Helpers ─────────────────────────────────────────────────

/** Human-readable label for a lead status */
export function statusLabel(status: LeadStatusValue): string {
  const labels: Record<LeadStatusValue, string> = {
    new: 'Ny',
    contacted: 'Kontaktet',
    qualified: 'Kvalificeret',
    coaching_active: 'Aktiv coaching',
    coaching_paused: 'Coaching pauset',
    coaching_completed: 'Coaching afsluttet',
    inactive: 'Inaktiv',
    opted_out: 'Frameldt',
  }
  return labels[status] || status
}

/** Status badge color class */
export function statusColor(status: LeadStatusValue): string {
  const colors: Record<LeadStatusValue, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    qualified: 'bg-green-100 text-green-700',
    coaching_active: 'bg-accent/20 text-accent',
    coaching_paused: 'bg-orange-100 text-orange-700',
    coaching_completed: 'bg-emerald-100 text-emerald-700',
    inactive: 'bg-gray-100 text-gray-600',
    opted_out: 'bg-red-100 text-red-600',
  }
  return colors[status] || 'bg-gray-100 text-gray-600'
}

/** Activity type icon/label mapping */
export function activityLabel(type: string): string {
  const labels: Record<string, string> = {
    signup: 'Oprettet konto',
    calculator_completed: 'Calculator udfyldt',
    newsletter_subscribed: 'Tilmeldt nyhedsbrev',
    profile_updated: 'Profil opdateret',
    recipe_saved: 'Opskrift gemt',
    email_sent: 'Email sendt',
    email_opened: 'Email åbnet',
    check_in_submitted: 'Check-in indsendt',
    coaching_activated: 'Coaching aktiveret',
    coaching_paused: 'Coaching pauset',
    coaching_completed: 'Coaching afsluttet',
    note_added: 'Note tilføjet',
    status_changed: 'Status ændret',
    consent_changed: 'Samtykke ændret',
    data_exported: 'Data eksporteret',
    account_deleted: 'Konto slettet',
  }
  return labels[type] || type
}
