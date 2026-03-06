import { supabase } from './supabase'

// ─── Types ───

export type SubscriptionTier = 'free' | 'premium' | 'pro'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'

export interface Subscription {
  id: string
  profile_id: string
  tier: SubscriptionTier
  status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

export interface FeatureGate {
  feature_key: string
  tier: SubscriptionTier
  is_enabled: boolean
  config: Record<string, unknown>
}

export interface FeatureAccess {
  hasAccess: boolean
  tier: SubscriptionTier
  requiredTier: SubscriptionTier | null
  limit: number | null
  config: Record<string, unknown>
}

// ─── Feature keys (must match feature_gates table) ───

export const FEATURES = {
  BASIC_CALCULATOR: 'basic_calculator',
  ADVANCED_MACROS: 'advanced_macros',
  BROWSE_RECIPES: 'browse_recipes',
  UNLIMITED_FAVORITES: 'unlimited_favorites',
  AI_MEAL_PLANS: 'ai_meal_plans',
  AI_CHAT: 'ai_chat',
  AI_IMAGE_GENERATION: 'ai_image_generation',
  BLOG_ACCESS: 'blog_access',
  RESEARCH_GUIDES: 'research_guides',
  COACHING_ACCESS: 'coaching_access',
  COACHING_CHECKINS: 'coaching_checkins',
  DATA_EXPORT: 'data_export',
  MEAL_PLAN_HISTORY: 'meal_plan_history',
  MONTHLY_MEAL_PLANS: 'monthly_meal_plans',
  FAVORITE_LIMIT: 'favorite_limit',
} as const

// ─── Tier hierarchy ───

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  premium: 1,
  pro: 2,
}

export function tierAtLeast(userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier]
}

// ─── Data fetching ───

export async function fetchUserSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('profile_id', userId)
    .single()

  if (error || !data) return null
  return data as Subscription
}

export async function fetchAllFeatureGates(): Promise<FeatureGate[]> {
  const { data, error } = await supabase
    .from('feature_gates')
    .select('feature_key, tier, is_enabled, config')
    .order('feature_key')

  if (error || !data) return []
  return data as FeatureGate[]
}

// ─── Feature checking ───

export function checkFeatureAccess(
  featureKey: string,
  userTier: SubscriptionTier,
  gates: FeatureGate[]
): FeatureAccess {
  // Find the gate for this feature + user's tier
  const gate = gates.find((g) => g.feature_key === featureKey && g.tier === userTier)

  if (gate?.is_enabled) {
    return {
      hasAccess: true,
      tier: userTier,
      requiredTier: null,
      limit: (gate.config as Record<string, number>)?.limit ?? null,
      config: gate.config || {},
    }
  }

  // Find the minimum tier that has access
  const tiersInOrder: SubscriptionTier[] = ['free', 'premium', 'pro']
  let requiredTier: SubscriptionTier | null = null

  for (const tier of tiersInOrder) {
    const tierGate = gates.find((g) => g.feature_key === featureKey && g.tier === tier)
    if (tierGate?.is_enabled) {
      requiredTier = tier
      break
    }
  }

  return {
    hasAccess: false,
    tier: userTier,
    requiredTier,
    limit: null,
    config: {},
  }
}

// ─── Tier display helpers ───

export const TIER_CONFIG: Record<SubscriptionTier, { label: string; color: string; bgColor: string }> = {
  free: { label: 'Free', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  premium: { label: 'Premium', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  pro: { label: 'Pro', color: 'text-purple-600', bgColor: 'bg-purple-100' },
}
