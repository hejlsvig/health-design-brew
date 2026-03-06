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

export async function fetchLeads(filters?: LeadFilters): Promise<LeadRow[]> {
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

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.source) query = query.eq('source', filters.source)

  const { data, error } = await query
  if (error) throw error

  let results = (data || []) as LeadRow[]

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
  const { error } = await supabase
    .from('lead_status')
    .update({ assigned_to: coachId })
    .eq('user_id', userId)

  if (error) throw error
}

export async function addLeadNote(userId: string, note: string, adminId: string) {
  const { error } = await supabase.from('lead_activity').insert({
    user_id: userId,
    activity_type: 'note_added',
    notes: note,
    created_by: adminId,
  })
  if (error) throw error
}

export async function fetchLeadActivity(userId: string) {
  const { data, error } = await supabase
    .from('lead_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
