import { supabase } from './supabase'

export type LeadStatusValue =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'coaching_active'
  | 'coaching_paused'
  | 'coaching_completed'
  | 'inactive'
  | 'opted_out'

export type LeadSource = 'calculator' | 'footer_form' | 'popup' | 'imported' | 'manual' | 'signup'

export interface LeadProfile {
  email: string
  name: string | null
  language: string | null
  daily_calories: number | null
  tdee: number | null
  bmr: number | null
  weight: number | null
  height: number | null
  age: number | null
  gender: string | null
  activity_level: string | null
  diet_type: string | null
  newsletter_consent: boolean
  marketing_consent: boolean
  coaching_contact_consent: boolean
  created_at: string
}

export interface LeadRow {
  id: number
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
  profile: LeadProfile | null
}

export interface LeadFilters {
  status?: LeadStatusValue
  source?: LeadSource
  search?: string
}

// Statuses that belong to the Coaching section, not the Leads list
const COACHING_STATUSES: LeadStatusValue[] = ['coaching_active', 'coaching_paused', 'coaching_completed']

/**
 * Unified lead origin — distinguishes authenticated leads from guest subscribers.
 * 'auth' = has a profiles + lead_status row (logged-in user)
 * 'subscriber' = only exists in newsletter_subscribers with contact_ok tag (guest)
 */
export type LeadOrigin = 'auth' | 'subscriber'

/** Extended lead row that can represent both auth leads and guest subscriber-leads */
export interface UnifiedLeadRow extends Omit<LeadRow, 'id' | 'user_id' | 'profile'> {
  id: number | string           // numeric for auth, uuid for subscriber
  user_id: string               // profile user_id or subscriber id
  origin: LeadOrigin
  profile: LeadProfile | null
  subscriber_id?: string
  tags?: string[]
}

export async function fetchLeads(filters?: LeadFilters): Promise<UnifiedLeadRow[]> {
  // 1. Fetch authenticated leads from lead_status
  let query = supabase
    .from('lead_status')
    .select(`
      *,
      profile:profiles (
        email, name, language, daily_calories, tdee, bmr,
        weight, height, age, gender, activity_level, diet_type,
        newsletter_consent, marketing_consent, coaching_contact_consent,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  } else {
    // By default, exclude coaching statuses — those belong in the Coaching page
    query = query.not('status', 'in', `(${COACHING_STATUSES.join(',')})`)
  }
  if (filters?.source) query = query.eq('source', filters.source)

  const { data, error } = await query
  if (error) throw error

  // Map auth leads to unified format
  const authLeads: UnifiedLeadRow[] = ((data || []) as LeadRow[]).map((l) => ({
    ...l,
    origin: 'auth' as LeadOrigin,
  }))

  // 2. Fetch guest subscriber-leads (contact_ok tag, no linked user)
  // Skip if filtering by a specific status that isn't 'new' (subscribers are always 'new')
  let subscriberLeads: UnifiedLeadRow[] = []
  const skipSubscribers = filters?.status && filters.status !== 'new'

  if (!skipSubscribers) {
    const { data: subs, error: subErr } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .contains('tags', ['contact_ok'])
      .eq('is_active', true)
      .is('linked_user_id', null)
      .order('created_at', { ascending: false })

    if (subErr) {
      console.error('Failed to fetch subscriber leads:', subErr)
    } else {
      // Build set of auth emails to deduplicate
      const authEmails = new Set(
        authLeads.map((l) => l.profile?.email?.toLowerCase()).filter(Boolean)
      )

      subscriberLeads = (subs || [])
        .filter((s: any) => !authEmails.has(s.email?.toLowerCase()))
        .map((s: any) => ({
          id: s.id,
          user_id: s.id,               // use subscriber id as identifier
          origin: 'subscriber' as LeadOrigin,
          source: (s.source || 'manual') as LeadSource,
          status: 'new' as LeadStatusValue,
          lead_score: calcSubscriberScore(s),
          assigned_to: null,
          first_contact_date: null,
          last_contact_date: null,
          follow_up_date: null,
          notes: null,
          created_at: s.created_at,
          updated_at: s.updated_at || s.created_at,
          subscriber_id: s.id,
          tags: s.tags,
          profile: {
            email: s.email,
            name: s.name || null,
            language: s.language || null,
            daily_calories: null,
            tdee: null,
            bmr: null,
            weight: null,
            height: null,
            age: null,
            gender: null,
            activity_level: null,
            diet_type: null,
            newsletter_consent: s.tags?.includes('newsletter') || false,
            marketing_consent: s.tags?.includes('contact_ok') || false,
            coaching_contact_consent: s.tags?.includes('contact_ok') || false,
            created_at: s.created_at,
          },
        }))
    }
  }

  // 3. Merge and filter
  let results = [...authLeads, ...subscriberLeads]

  if (filters?.search) {
    const s = filters.search.toLowerCase()
    results = results.filter((r) => {
      const p = r.profile
      return (
        p?.email?.toLowerCase().includes(s) ||
        p?.name?.toLowerCase().includes(s)
      )
    })
  }

  return results
}

/** Calculate a basic lead score for a subscriber based on their tags */
function calcSubscriberScore(sub: any): number {
  let score = 10
  if (sub.tags?.includes('meal_plan')) score += 20
  if (sub.tags?.includes('newsletter')) score += 10
  if (sub.tags?.includes('contact_ok')) score += 15
  return Math.min(score, 100)
}

export async function fetchLeadById(userId: string) {
  const { data, error } = await supabase
    .from('lead_status')
    .select(`
      *,
      profile:profiles (
        id, email, name, language, age, gender, weight, height,
        activity_level, units, bmr, tdee, daily_calories,
        weight_goal, diet_type, fasting_protocol, meals_per_day,
        excluded_ingredients, prep_time, gdpr_consent, marketing_consent,
        coaching_contact_consent, newsletter_consent, created_at, updated_at
      )
    `)
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data
}

// Map lead_status coaching values → coaching_clients status values
const LEAD_TO_COACHING_STATUS: Record<string, string> = {
  coaching_active: 'active',
  coaching_paused: 'inactive',
  coaching_completed: 'completed',
}

export async function updateLeadStatus(
  userId: string,
  newStatus: LeadStatusValue,
  adminId: string,
  notes?: string
) {
  const { error } = await supabase
    .from('lead_status')
    .update({ status: newStatus, notes: notes || null, updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) throw error

  // Sync coaching_clients when lead_status changes to/from a coaching status
  const coachingStatus = LEAD_TO_COACHING_STATUS[newStatus]
  if (coachingStatus) {
    // Moving INTO coaching — upsert coaching_clients record
    const updates: Record<string, unknown> = { status: coachingStatus }
    if (coachingStatus === 'completed') updates.end_date = new Date().toISOString()
    if (coachingStatus === 'active') updates.start_date = new Date().toISOString()

    // Try update first; if no row exists, insert one
    const { data: existing } = await supabase
      .from('coaching_clients')
      .select('id')
      .eq('profile_id', userId)
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase.from('coaching_clients').update(updates).eq('profile_id', userId)
    } else if (coachingStatus === 'active') {
      await supabase.from('coaching_clients').insert({
        profile_id: userId,
        status: 'active',
        start_date: new Date().toISOString(),
        check_in_frequency: 'weekly',
      })
    }
  }

  // Log activity
  await supabase.from('lead_activity').insert({
    user_id: userId,
    activity_type: 'status_changed',
    activity_details: { from: null, to: newStatus },
    created_by: adminId,
    notes: notes || null,
  })
}

export async function assignLead(userId: string, coachId: string | null) {
  // Try user_id first, then subscriber_id
  const { error } = await supabase
    .from('lead_status')
    .update({ assigned_to: coachId })
    .eq('user_id', userId)

  if (error) {
    // Fallback: try subscriber_id
    const { error: subErr } = await supabase
      .from('lead_status')
      .update({ assigned_to: coachId })
      .eq('subscriber_id', userId)
    if (subErr) throw subErr
  }
}

export async function addLeadNote(userId: string, note: string, adminId: string) {
  // Check if this is a subscriber-only lead (no profile)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  const insertData = profile
    ? { user_id: userId, activity_type: 'note_added' as const, notes: note, created_by: adminId }
    : { subscriber_id: userId, activity_type: 'note_added' as const, notes: note, created_by: adminId }

  const { error } = await supabase.from('lead_activity').insert(insertData)
  if (error) throw error
}

export async function fetchLeadActivity(userId: string) {
  // Try user_id first
  const { data, error } = await supabase
    .from('lead_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!error && data && data.length > 0) {
    return data
  }

  // Fallback: try subscriber_id
  const { data: subData, error: subErr } = await supabase
    .from('lead_activity')
    .select('*')
    .eq('subscriber_id', userId)
    .order('created_at', { ascending: false })

  if (subErr) throw subErr
  return subData || []
}
