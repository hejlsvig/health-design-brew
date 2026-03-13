import { supabase } from './supabase'

export interface CoachingClient {
  id: string
  profile_id: string
  coach_id: string | null
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
  coach?: {
    id: string
    name: string | null
    email: string
    sender_email: string | null
  }
}

// Map coaching_clients status → lead_status status
const COACHING_TO_LEAD_STATUS: Record<string, string> = {
  active: 'coaching_active',
  inactive: 'coaching_paused',
  completed: 'coaching_completed',
}

/**
 * Syncs lead_status to match coaching state.
 * When coaching is activated/changed, lead_status is updated so the person
 * only appears in one place (Leads OR Coaching, never both).
 */
async function syncLeadStatus(userId: string, coachingStatus: string, isSubscriber = false): Promise<void> {
  const leadStatus = COACHING_TO_LEAD_STATUS[coachingStatus]
  if (!leadStatus) return

  const col = isSubscriber ? 'subscriber_id' : 'user_id'
  await supabase
    .from('lead_status')
    .update({ status: leadStatus, updated_at: new Date().toISOString() })
    .eq(col, userId)
}

export async function fetchCoachingClients(): Promise<CoachingClient[]> {
  const { data, error } = await supabase
    .from('coaching_clients')
    .select(`
      *,
      profile:profiles (email, name, weight, daily_calories),
      coach:crm_users!coach_id (id, name, email, sender_email)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as CoachingClient[]
}

export async function activateCoaching(
  userId: string,
  opts?: { package?: string; frequency?: string; coachId?: string }
) {
  const { error } = await supabase.from('coaching_clients').upsert(
    {
      profile_id: userId,
      status: 'active',
      start_date: new Date().toISOString(),
      coaching_package: opts?.package || null,
      check_in_frequency: opts?.frequency || 'weekly',
      coach_id: opts?.coachId || null,
    },
    { onConflict: 'profile_id' }
  )

  if (error) throw error

  // Sync lead_status so person moves from Leads → Coaching
  await syncLeadStatus(userId, 'active')
}

export async function updateCoachingStatus(
  profileId: string,
  newStatus: CoachingClient['status']
): Promise<void> {
  const updates: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'completed') {
    updates.end_date = new Date().toISOString()
  }

  const { error } = await supabase
    .from('coaching_clients')
    .update(updates)
    .eq('profile_id', profileId)

  if (error) throw error

  // Sync lead_status to match
  await syncLeadStatus(profileId, newStatus)
}

/**
 * Activate a subscriber-only lead as a coaching client.
 * Uses subscriber_id instead of profile_id.
 */
export async function activateSubscriberCoaching(
  subscriberId: string,
  opts?: { package?: string; frequency?: string; coachId?: string }
) {
  const { error } = await supabase.from('coaching_clients').insert({
    subscriber_id: subscriberId,
    status: 'active',
    start_date: new Date().toISOString(),
    coaching_package: opts?.package || null,
    check_in_frequency: opts?.frequency || 'weekly',
    coach_id: opts?.coachId || null,
  })

  if (error) throw error

  // Sync lead_status so person moves from Leads → Coaching
  await syncLeadStatus(subscriberId, 'active', true)
}

export async function assignCoach(clientProfileId: string, coachId: string | null): Promise<void> {
  const { error } = await supabase
    .from('coaching_clients')
    .update({ coach_id: coachId })
    .eq('profile_id', clientProfileId)

  if (error) throw error
}
