import { supabase } from './supabase'

export type SubscriptionTier = 'free' | 'premium' | 'pro'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'

export interface Subscription {
  id: string
  profile_id: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_price_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface FeatureGate {
  feature_key: string
  tier: SubscriptionTier
  is_enabled: boolean
  config: Record<string, unknown>
  description: string | null
}

// ─── Subscription CRUD ───

export async function fetchSubscription(profileId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('profile_id', profileId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
  return data as Subscription | null
}

export async function fetchAllSubscriptions(): Promise<(Subscription & { profile?: { email: string; name: string | null } })[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`*, profile:profiles (email, name)`)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as (Subscription & { profile?: { email: string; name: string | null } })[]
}

export async function updateSubscriptionTier(
  profileId: string,
  newTier: SubscriptionTier,
  adminId?: string
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ tier: newTier, updated_at: new Date().toISOString() })
    .eq('profile_id', profileId)

  if (error) throw error

  // Log activity
  if (adminId) {
    await supabase.from('lead_activity').insert({
      user_id: profileId,
      activity_type: 'status_changed',
      activity_details: { type: 'subscription_tier_change', new_tier: newTier },
      created_by: adminId,
      notes: `Subscription tier changed to ${newTier}`,
    })
  }
}

export async function updateSubscriptionStatus(
  profileId: string,
  newStatus: SubscriptionStatus
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('profile_id', profileId)

  if (error) throw error
}

export async function updateSubscriptionStripe(
  profileId: string,
  stripeData: {
    stripe_customer_id?: string
    stripe_subscription_id?: string
    stripe_price_id?: string
    current_period_start?: string
    current_period_end?: string
    cancel_at_period_end?: boolean
  }
): Promise<void> {
  const { error } = await supabase
    .from('subscriptions')
    .update({ ...stripeData, updated_at: new Date().toISOString() })
    .eq('profile_id', profileId)

  if (error) throw error
}

// ─── Feature Gates ───

export async function fetchFeatureGates(): Promise<FeatureGate[]> {
  const { data, error } = await supabase
    .from('feature_gates')
    .select('feature_key, tier, is_enabled, config, description')
    .order('feature_key')

  if (error) throw error
  return (data || []) as FeatureGate[]
}

export async function fetchFeatureGatesForTier(tier: SubscriptionTier): Promise<Map<string, { enabled: boolean; config: Record<string, unknown> }>> {
  const { data, error } = await supabase
    .from('feature_gates')
    .select('feature_key, is_enabled, config')
    .eq('tier', tier)

  if (error) throw error

  const map = new Map<string, { enabled: boolean; config: Record<string, unknown> }>()
  for (const row of data || []) {
    map.set(row.feature_key, { enabled: row.is_enabled, config: row.config || {} })
  }
  return map
}

export async function updateFeatureGate(
  featureKey: string,
  tier: SubscriptionTier,
  isEnabled: boolean,
  config?: Record<string, unknown>
): Promise<void> {
  const updateData: Record<string, unknown> = { is_enabled: isEnabled }
  if (config !== undefined) updateData.config = config

  const { error } = await supabase
    .from('feature_gates')
    .update(updateData)
    .eq('feature_key', featureKey)
    .eq('tier', tier)

  if (error) throw error
}
