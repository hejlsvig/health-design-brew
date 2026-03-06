import { supabase } from './supabase'

export interface CoachingClient {
  id: string
  profile_id: string
  status: 'active' | 'inactive' | 'completed'
  start_date: string
  end_date: string | null
  notes: string | null
  check_in_frequency: string | null
  coaching_package: string | null
  created_at: string
  profile?: {
    email: string
    name: string | null
    weight: number | null
    daily_calories: number | null
  }
}

export async function fetchCoachingClients(): Promise<CoachingClient[]> {
  const { data, error } = await supabase
    .from('coaching_clients')
    .select(`
      *,
      profile:profiles (email, name, weight, daily_calories)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as CoachingClient[]
}

export async function activateCoaching(
  userId: string,
  opts?: { package?: string; frequency?: string }
) {
  const { error } = await supabase.from('coaching_clients').upsert(
    {
      profile_id: userId,
      status: 'active',
      start_date: new Date().toISOString(),
      coaching_package: opts?.package || null,
      check_in_frequency: opts?.frequency || 'weekly',
    },
    { onConflict: 'profile_id' }
  )

  if (error) throw error
}
