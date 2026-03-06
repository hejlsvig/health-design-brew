/**
 * Public check-in API — token-based access without authentication.
 * Uses Supabase RPC functions (SECURITY DEFINER) that validate the access_token internally.
 */
import { supabase } from './supabase'

/* ─── Types ─── */

export interface CoachingProfile {
  full_name: string
  email: string
  language: string | null
  start_weight: number | null
  goal_weight: number | null
  daily_calories: number | null
}

export interface CoachingClientPublic {
  id: string
  profile_id: string
  status: string
  start_date: string
  check_in_frequency: string | null
  coaching_package: string | null
  profile: CoachingProfile
}

export interface CheckinEntry {
  id: string
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
}

export interface CheckinFormData {
  weight: number | null
  mood: number | null
  energy: number | null
  hunger: string
  cravings: string
  sleep_hours: number | null
  sleep_quality: number | null
  digestion: string
  activity: string
  fasting_hours: number | null
  fasting_feeling: string
  stress_factors: string
  weekly_win: string
  deviations: string
  notes: string
}

export const EMPTY_FORM: CheckinFormData = {
  weight: null,
  mood: 5,
  energy: 5,
  hunger: 'none',
  cravings: 'none',
  sleep_hours: null,
  sleep_quality: 5,
  digestion: 'normal',
  activity: 'light',
  fasting_hours: null,
  fasting_feeling: 'ok',
  stress_factors: 'none',
  weekly_win: '',
  deviations: '',
  notes: '',
}

/* ─── API ─── */

export async function fetchCoachingByToken(token: string): Promise<CoachingClientPublic> {
  const { data, error } = await supabase.rpc('get_coaching_by_token', { p_token: token })
  if (error) throw new Error(error.message)
  return data as CoachingClientPublic
}

export async function fetchCheckinsByToken(token: string, limit = 20): Promise<CheckinEntry[]> {
  const { data, error } = await supabase.rpc('get_checkins_by_token', {
    p_token: token,
    p_limit: limit,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as CheckinEntry[]
}

export async function submitCheckinByToken(
  token: string,
  form: CheckinFormData
): Promise<{ id: string; week_number: number }> {
  const { data, error } = await supabase.rpc('submit_checkin_by_token', {
    p_token: token,
    p_weight: form.weight,
    p_mood: form.mood,
    p_energy: form.energy,
    p_hunger: form.hunger || null,
    p_cravings: form.cravings || null,
    p_sleep_hours: form.sleep_hours,
    p_sleep_quality: form.sleep_quality,
    p_digestion: form.digestion || null,
    p_activity: form.activity || null,
    p_fasting_hours: form.fasting_hours,
    p_fasting_feeling: form.fasting_feeling || null,
    p_stress_factors: form.stress_factors || null,
    p_weekly_win: form.weekly_win || null,
    p_deviations: form.deviations || null,
    p_notes: form.notes || null,
  })
  if (error) throw new Error(error.message)
  return data as { id: string; week_number: number }
}
