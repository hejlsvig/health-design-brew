import { supabase } from './supabase'

export interface CheckinRow {
  id: string
  coaching_client_id: string
  week_number: number | null
  weight: number | null
  mood: number | null
  energy: number | null
  hunger: string | null
  cravings: string | null
  sleep_hours: number | null
  sleep_quality: number | null
  digestion: string | null
  activity: string | null
  fasting_hours: number | null
  fasting_feeling: string | null
  stress_factors: string | null
  weekly_win: string | null
  deviations: string | null
  notes: string | null
  created_at: string
  coaching_client?: {
    profile_id: string
    profiles?: { name: string | null; email: string }
  }
}

export interface CheckinFilters {
  clientId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export async function fetchAllCheckins(filters?: CheckinFilters, limit = 100): Promise<CheckinRow[]> {
  let query = supabase
    .from('weekly_checkins')
    .select(`
      *,
      coaching_client:coaching_clients (
        profile_id,
        profiles (name, email)
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters?.clientId) {
    query = query.eq('coaching_client_id', filters.clientId)
  }
  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []) as unknown as CheckinRow[]
}

export interface CheckinTrend {
  date: string
  weight: number | null
  mood: number | null
  energy: number | null
  sleepHours: number | null
  sleepQuality: number | null
}

export async function fetchCheckinTrends(coachingClientId: string): Promise<CheckinTrend[]> {
  const { data, error } = await supabase
    .from('weekly_checkins')
    .select('created_at, weight, mood, energy, sleep_hours, sleep_quality')
    .eq('coaching_client_id', coachingClientId)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data || []).map((row) => ({
    date: new Date(row.created_at).toLocaleDateString(),
    weight: row.weight,
    mood: row.mood,
    energy: row.energy,
    sleepHours: row.sleep_hours,
    sleepQuality: row.sleep_quality,
  }))
}

export interface CheckinStats {
  totalCheckins: number
  avgMood: number
  avgEnergy: number
  avgSleep: number
  latestWeight: number | null
  weightChange: number | null
}

export async function fetchCheckinStats(coachingClientId: string): Promise<CheckinStats> {
  const { data, error } = await supabase
    .from('weekly_checkins')
    .select('weight, mood, energy, sleep_hours')
    .eq('coaching_client_id', coachingClientId)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = data || []
  if (rows.length === 0) {
    return { totalCheckins: 0, avgMood: 0, avgEnergy: 0, avgSleep: 0, latestWeight: null, weightChange: null }
  }

  const moods = rows.filter((r) => r.mood != null).map((r) => r.mood!)
  const energies = rows.filter((r) => r.energy != null).map((r) => r.energy!)
  const sleeps = rows.filter((r) => r.sleep_hours != null).map((r) => r.sleep_hours!)
  const weights = rows.filter((r) => r.weight != null).map((r) => r.weight!)

  return {
    totalCheckins: rows.length,
    avgMood: moods.length > 0 ? Math.round((moods.reduce((a, b) => a + b, 0) / moods.length) * 10) / 10 : 0,
    avgEnergy: energies.length > 0 ? Math.round((energies.reduce((a, b) => a + b, 0) / energies.length) * 10) / 10 : 0,
    avgSleep: sleeps.length > 0 ? Math.round((sleeps.reduce((a, b) => a + b, 0) / sleeps.length) * 10) / 10 : 0,
    latestWeight: weights.length > 0 ? weights[weights.length - 1] : null,
    weightChange: weights.length >= 2 ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 : null,
  }
}
