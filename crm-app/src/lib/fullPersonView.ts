import { supabase } from './supabase'
import { fetchSubscription, type Subscription } from './subscriptions'
import { fetchEmailsForUser, type EmailSend } from './emails'
import { fetchMealPlansForUser, type MealPlan } from './mealplans'

// Full profile with ALL fields
export interface FullProfile {
  id: string
  email: string
  name: string | null
  source: string
  profile_type: string
  language: string
  gender: string | null
  age: number | null
  weight: number | null
  height: number | null
  activity_level: string | null
  units: string | null
  bmr: number | null
  tdee: number | null
  daily_calories: number | null
  weight_goal: number | null
  diet_type: string | null
  fasting_protocol: string | null
  meals_per_day: number | null
  prep_time: string | null
  excluded_ingredients: string[] | null
  selected_ingredients: string[] | null
  gdpr_consent: boolean
  marketing_consent: boolean
  newsletter_consent: boolean
  coaching_contact_consent: boolean
  email_frequency_preference: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface CoachingInfo {
  id: string
  profile_id: string
  coach_id: string | null
  status: string
  start_date: string | null
  end_date: string | null
  notes: string | null
  check_in_frequency: string | null
  checkin_reminders_enabled: boolean
  payment_status: string | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  coaching_package: string | null
  created_at: string
  coach?: {
    id: string
    name: string | null
    email: string
    sender_email: string | null
  }
}

export interface WeeklyCheckin {
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
}

export interface ConsentEntry {
  id: string
  consent_type: string
  granted: boolean
  source: string | null
  notes: string | null
  created_at: string
}

export interface UserFavorite {
  id: string
  recipe_id: string
  created_at: string
  recipe?: {
    title: Record<string, string>
    slug: string
    calories: number | null
    image_url: string | null
  }
}

export interface LeadStatusInfo {
  user_id: string
  source: string
  status: string
  lead_score: number
  assigned_to: string | null
  first_contact_date: string | null
  last_contact_date: string | null
  follow_up_date: string | null
  notes: string | null
}

export interface SubscriberInfo {
  id: string
  email: string
  name: string | null
  source: string | null
  tags: string[]
  language: string | null
  gdpr_consent: boolean
  subscribed: boolean
  created_at: string
  updated_at: string
}

export interface FullPersonData {
  profile: FullProfile | null
  subscriber: SubscriberInfo | null
  isSubscriberOnly: boolean
  leadStatus: LeadStatusInfo | null
  subscription: Subscription | null
  coaching: CoachingInfo | null
  checkins: WeeklyCheckin[]
  emailHistory: EmailSend[]
  mealPlans: MealPlan[]
  favorites: UserFavorite[]
  consentLog: ConsentEntry[]
}

/**
 * Fetches ALL data about a person in parallel.
 * Used by LeadDetail for the 360° person view.
 */
export async function fetchFullPersonData(userId: string): Promise<FullPersonData> {
  // First: try to load profile (auth user)
  const profileResult = await supabase.from('profiles').select('*').eq('id', userId).single()
  const profile = profileResult.data as FullProfile | null

  // If no profile, check if it's a subscriber
  let subscriber: SubscriberInfo | null = null
  if (!profile) {
    const { data: subData } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('id', userId)
      .single()
    if (subData) {
      subscriber = {
        id: subData.id,
        email: subData.email,
        name: subData.name || null,
        source: subData.source || null,
        tags: subData.tags || [],
        language: subData.language || null,
        gdpr_consent: false, // derived from consent_log, not stored on subscriber
        subscribed: subData.is_active ?? true,
        created_at: subData.created_at,
        updated_at: subData.updated_at || subData.created_at,
      } as SubscriberInfo
    }
  }

  const isSubscriberOnly = !profile && !!subscriber

  // Now fetch all related data in parallel, using the right lookup strategy
  const [
    leadResult,
    leadResultSub,
    subscription,
    coachingResult,
    coachingResultSub,
    emailHistory,
    mealPlans,
    favoritesResult,
    consentResult,
    consentResultSub,
  ] = await Promise.all([
    // Lead status by user_id
    supabase.from('lead_status').select('*').eq('user_id', userId).maybeSingle(),
    // Lead status by subscriber_id (for subscriber-only)
    isSubscriberOnly
      ? supabase.from('lead_status').select('*').eq('subscriber_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    // Subscription (only for auth users)
    profile ? fetchSubscription(userId) : Promise.resolve(null),
    // Coaching by profile_id
    supabase.from('coaching_clients').select('*, coach:crm_users!coach_id (id, name, email, sender_email)').eq('profile_id', userId).order('created_at', { ascending: false }).limit(1),
    // Coaching by subscriber_id
    isSubscriberOnly
      ? supabase.from('coaching_clients').select('*, coach:crm_users!coach_id (id, name, email, sender_email)').eq('subscriber_id', userId).order('created_at', { ascending: false }).limit(1)
      : Promise.resolve({ data: null, error: null }),
    // Email history (already handles subscriber_id fallback)
    fetchEmailsForUser(userId),
    // Meal plans (already handles subscriber_id fallback)
    fetchMealPlansForUser(userId),
    // Favorites (only for auth users)
    profile
      ? supabase.from('user_favorites').select(`
          id, recipe_id, created_at,
          recipe:recipes (title, slug, calories, image_url)
        `).eq('user_id', userId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    // Consent log by user_id
    supabase.from('consent_log').select('id, consent_type, granted, source, notes, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }),
    // Consent log by subscriber_id
    isSubscriberOnly
      ? supabase.from('consent_log').select('id, consent_type, granted, source, notes, created_at')
          .eq('subscriber_id', userId).order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  // Merge subscriber consent with user consent
  const consentLog = [
    ...((consentResult.data || []) as ConsentEntry[]),
    ...((consentResultSub.data || []) as ConsentEntry[]),
  ]

  // Deduplicate by id
  const seenIds = new Set<string>()
  const uniqueConsent = consentLog.filter(c => {
    if (seenIds.has(c.id)) return false
    seenIds.add(c.id)
    return true
  })

  // Update subscriber gdpr_consent from consent_log
  // GDPR consent is derived from any data-processing-related consent type
  if (subscriber && uniqueConsent.length > 0) {
    const gdprTypes = ['data_processing', 'meal_plan_delivery', 'contact_permission']
    const hasGdpr = uniqueConsent.some(c => gdprTypes.includes(c.consent_type) && c.granted)
    subscriber.gdpr_consent = hasGdpr
  }

  // Pick lead status (prefer user_id match, fallback to subscriber_id)
  const leadStatus = leadResult.data || leadResultSub.data

  // Pick coaching (prefer profile match, fallback to subscriber)
  const coachingData = coachingResult.data?.[0] || coachingResultSub.data?.[0]

  return {
    profile,
    subscriber,
    isSubscriberOnly,
    leadStatus: leadStatus as LeadStatusInfo | null,
    subscription,
    coaching: (coachingData as CoachingInfo | null) ?? null,
    checkins: [],
    emailHistory,
    mealPlans,
    favorites: (favoritesResult.data || []) as unknown as UserFavorite[],
    consentLog: uniqueConsent,
  }
}

/**
 * Fetches check-ins for a coaching client (lazy loaded).
 */
export async function fetchCheckinsForCoachingClient(coachingClientId: string): Promise<WeeklyCheckin[]> {
  const { data, error } = await supabase
    .from('weekly_checkins')
    .select('*')
    .eq('coaching_client_id', coachingClientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as WeeklyCheckin[]
}

/**
 * Updates profile fields from CRM.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<FullProfile>,
  adminId?: string
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) throw error

  // Log activity
  if (adminId) {
    await supabase.from('lead_activity').insert({
      user_id: userId,
      activity_type: 'profile_updated',
      activity_details: { updated_fields: Object.keys(updates) },
      created_by: adminId,
      notes: `Profile updated: ${Object.keys(updates).join(', ')}`,
    })
  }
}
