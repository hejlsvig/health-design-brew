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

export type LeadSource = 'calculator' | 'newsletter' | 'website_signup' | 'manual' | 'imported' | 'meal_plan'

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

export interface SubscriberRow {
  id: string
  email: string
  name: string | null
  source: string
  language: string
  is_active: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

/**
 * Unified lead row — can represent either an authenticated lead (from lead_status)
 * or a guest lead (from newsletter_subscribers with contact_ok tag).
 * Guest leads have `origin: 'subscriber'` and limited fields.
 */
export type UnifiedLeadOrigin = 'auth' | 'subscriber'

export interface UnifiedLeadRow {
  id: string                    // user_id or subscriber id
  origin: UnifiedLeadOrigin     // where this lead comes from
  email: string
  name: string | null
  source: LeadSource | string
  status: LeadStatusValue
  lead_score: number
  language: string | null
  created_at: string
  updated_at: string
  last_contact_date: string | null
  follow_up_date: string | null
  notes: string | null
  // Consent flags (from profile or subscriber tags)
  newsletter_consent: boolean
  marketing_consent: boolean
  coaching_contact_consent: boolean
  // Original data for navigation
  subscriber_id?: string        // set when origin === 'subscriber'
  user_id?: string              // set when origin === 'auth'
  tags?: string[]               // subscriber tags
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
    .not('user_id', 'is', null)   // Skip orphaned subscriber-only entries
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

/** Fetch a single lead with full profile, consent log, and activity timeline.
 *  If not found in profiles/lead_status, falls back to newsletter_subscribers. */
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

  // If no profile found, try looking up as a subscriber
  if (!profileRes.data && !leadRes.data) {
    try {
      return await fetchSubscriberDetail(userId)
    } catch {
      // Not found as subscriber either — return empty
    }
  }

  return {
    subscriber: null,
    lead: leadRes.data,
    profile: profileRes.data,
    consentLog: consentRes.data || [],
    activityLog: activityRes.data || [],
    coaching: coachingRes.data?.[0] || null,
    isSubscriber: false,
  }
}

/** Fetch a single subscriber detail (for guest leads without a profile) */
export async function fetchSubscriberDetail(subscriberId: string) {
  const { data: subscriber, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('id', subscriberId)
    .single()

  if (error) throw error

  // Fetch consent log entries by email (subscribers don't have user_id in consent_log,
  // but the edge function logs with the subscriber email)
  const { data: consentLog } = await supabase
    .from('consent_log')
    .select('*')
    .eq('details', subscriber.email)
    .order('created_at', { ascending: false })

  return {
    subscriber,
    lead: null,
    profile: null,
    consentLog: consentLog || [],
    activityLog: [],
    coaching: null,
    isSubscriber: true,
  }
}

/** Fetch all newsletter subscribers (guests from meal_plan, footer, etc.) */
export async function fetchSubscribers(filters?: {
  source?: string
  search?: string
  activeOnly?: boolean
}) {
  let query = supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.source) {
    query = query.eq('source', filters.source)
  }
  if (filters?.activeOnly) {
    query = query.eq('is_active', true)
  }

  const { data, error } = await query
  if (error) throw error

  let results = (data || []) as SubscriberRow[]
  if (filters?.search) {
    const s = filters.search.toLowerCase()
    results = results.filter(r =>
      r.email?.toLowerCase().includes(s) || r.name?.toLowerCase().includes(s),
    )
  }

  return results
}

/** Get CRM dashboard stats (includes subscribers count) */
export async function fetchCrmStats(): Promise<CrmStats & { totalSubscribers: number }> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [totalRes, newRes, qualifiedRes, coachingRes, subsRes] = await Promise.all([
    supabase.from('lead_status').select('id', { count: 'exact', head: true }).not('user_id', 'is', null),
    supabase.from('lead_status').select('id', { count: 'exact', head: true }).not('user_id', 'is', null).gte('created_at', weekAgo),
    supabase.from('lead_status').select('id', { count: 'exact', head: true }).not('user_id', 'is', null).eq('status', 'qualified'),
    supabase.from('lead_status').select('id', { count: 'exact', head: true }).not('user_id', 'is', null).eq('status', 'coaching_active'),
    supabase.from('newsletter_subscribers').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  return {
    totalLeads: totalRes.count || 0,
    newThisWeek: newRes.count || 0,
    qualified: qualifiedRes.count || 0,
    activeCoaching: coachingRes.count || 0,
    totalSubscribers: subsRes.count || 0,
  }
}

/**
 * Fetch a unified list of all leads — both authenticated (lead_status)
 * and guest subscribers who gave contact consent (contact_ok tag).
 * Guest subscribers without a linked user are shown as "subscriber" origin leads.
 */
export async function fetchUnifiedLeads(filters?: {
  status?: LeadStatusValue
  source?: LeadSource | string
  search?: string
}): Promise<UnifiedLeadRow[]> {
  // 1. Fetch authenticated leads
  const authLeads = await fetchLeads(filters?.status ? { status: filters.status } : undefined)

  // 2. Fetch subscriber leads (with contact_ok tag, not linked to a user)
  let subQuery = supabase
    .from('newsletter_subscribers')
    .select('*')
    .contains('tags', ['contact_ok'])
    .eq('is_active', true)
    .is('linked_user_id', null)   // Only guests — linked users already appear via lead_status
    .order('created_at', { ascending: false })

  const { data: subLeads, error: subErr } = await subQuery
  if (subErr) console.error('Failed to fetch subscriber leads:', subErr)

  // 3. Get emails of authenticated leads to avoid duplicates
  const authEmails = new Set(
    authLeads.map((l: any) => l.profile?.email?.toLowerCase()).filter(Boolean)
  )

  // 4. Map auth leads to unified format
  const unified: UnifiedLeadRow[] = authLeads.map((l: any) => ({
    id: l.user_id,
    origin: 'auth' as UnifiedLeadOrigin,
    email: l.profile?.email || '',
    name: l.profile?.name || null,
    source: l.source,
    status: l.status,
    lead_score: l.lead_score,
    language: l.profile?.language || null,
    created_at: l.created_at,
    updated_at: l.updated_at,
    last_contact_date: l.last_contact_date,
    follow_up_date: l.follow_up_date,
    notes: l.notes,
    newsletter_consent: l.profile?.newsletter_consent || false,
    marketing_consent: l.profile?.marketing_consent || false,
    coaching_contact_consent: l.profile?.coaching_contact_consent || false,
    user_id: l.user_id,
  }))

  // 5. Map subscriber leads to unified format (skip if already in auth leads)
  const subUnified: UnifiedLeadRow[] = (subLeads || [])
    .filter((s: any) => !authEmails.has(s.email?.toLowerCase()))
    .map((s: any) => ({
      id: s.id,
      origin: 'subscriber' as UnifiedLeadOrigin,
      email: s.email,
      name: s.name || null,
      source: s.source || 'unknown',
      status: 'new' as LeadStatusValue,
      lead_score: calcSubscriberScore(s),
      language: s.language || null,
      created_at: s.created_at,
      updated_at: s.updated_at,
      last_contact_date: null,
      follow_up_date: null,
      notes: null,
      newsletter_consent: s.tags?.includes('newsletter') || false,
      marketing_consent: s.tags?.includes('contact_ok') || false,
      coaching_contact_consent: s.tags?.includes('contact_ok') || false,
      subscriber_id: s.id,
      tags: s.tags,
    }))

  let all = [...unified, ...subUnified]

  // 6. Apply filters
  if (filters?.source) {
    all = all.filter(l => l.source === filters.source)
  }
  if (filters?.search) {
    const s = filters.search.toLowerCase()
    all = all.filter(l =>
      l.email?.toLowerCase().includes(s) || l.name?.toLowerCase()?.includes(s)
    )
  }
  // Status filter already applied for auth leads; apply to subscriber leads too
  if (filters?.status) {
    all = all.filter(l => l.status === filters.status)
  }

  return all
}

/** Calculate a basic lead score for a subscriber based on their tags/activity */
function calcSubscriberScore(sub: any): number {
  let score = 10 // base: gave email
  if (sub.tags?.includes('meal_plan')) score += 20  // generated a meal plan
  if (sub.tags?.includes('newsletter')) score += 10 // opted into newsletter
  if (sub.tags?.includes('contact_ok')) score += 15 // gave contact consent
  return Math.min(score, 100)
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
    meal_plan_generated: 'Kostplan genereret',
    status_changed: 'Status ændret',
    consent_changed: 'Samtykke ændret',
    data_exported: 'Data eksporteret',
    account_deleted: 'Konto slettet',
  }
  return labels[type] || type
}
