import { supabase } from './supabase'

export interface MealPlan {
  id: string
  profile_id: string | null
  subscriber_id: string | null
  email: string | null
  name: string | null
  pdf_filename: string
  pdf_storage_path: string | null
  tokens_used: number | null
  cost_usd: number | null
  model: string
  num_days: number | null
  daily_calories: number | null
  meals_per_day: number | null
  diet_type: string | null
  language: string | null
  status: string | null
  email_sent: boolean | null
  email_sent_at: string | null
  created_at: string
}

export async function fetchMealPlansForUser(userId: string): Promise<MealPlan[]> {
  // Try by profile_id first
  const { data, error } = await supabase
    .from('generated_meal_plans')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })

  if (!error && data && data.length > 0) {
    return data as MealPlan[]
  }

  // Try by subscriber_id (for subscriber-only leads)
  const { data: subData, error: subErr } = await supabase
    .from('generated_meal_plans')
    .select('*')
    .eq('subscriber_id', userId)
    .order('created_at', { ascending: false })

  if (!subErr && subData && subData.length > 0) {
    return subData as MealPlan[]
  }

  // Fallback: check profiles.meal_plan_pdf_url (legacy)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, meal_plan_pdf_url, updated_at')
    .eq('id', userId)
    .single()

  if (profile?.meal_plan_pdf_url) {
    return [{
      id: `profile-${userId}`,
      profile_id: userId,
      subscriber_id: null,
      email: null,
      name: null,
      pdf_filename: profile.meal_plan_pdf_url.split('/').pop() || 'kostplan.pdf',
      pdf_storage_path: profile.meal_plan_pdf_url,
      tokens_used: null,
      cost_usd: null,
      model: '—',
      num_days: null,
      daily_calories: null,
      meals_per_day: null,
      diet_type: null,
      language: null,
      status: null,
      email_sent: null,
      email_sent_at: null,
      created_at: profile.updated_at || new Date().toISOString(),
    }]
  }

  return []
}

export async function fetchAllMealPlans(limit = 100): Promise<(MealPlan & { profile?: { email: string; name: string | null } })[]> {
  const { data, error } = await supabase
    .from('generated_meal_plans')
    .select(`*, profile:profiles (email, name)`)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as (MealPlan & { profile?: { email: string; name: string | null } })[]
}

/**
 * Parameters for generating and sending a meal plan via the Edge Function.
 * When coach_id is provided, the Edge Function uses coach-specific SMTP.
 */
export interface SendMealPlanParams {
  name: string
  email: string
  language: string
  gender?: string | null
  age?: number | null
  weight?: number | null
  height?: number | null
  activity?: string | null
  daily_calories: number
  meals_per_day: number
  num_days: number
  prep_time?: string | null
  leftovers?: boolean
  leftovers_strategy?: string
  excluded_ingredients?: string
  diet_type?: string
  budget?: string
  health_anti_inflammatory?: boolean
  health_avoid_processed?: boolean
  weight_goal?: number | null
  units?: string
  coach_id: string // CRM user id of the coach sending the plan
}

export interface SendMealPlanResult {
  success: boolean
  mealPlanText?: string
  pdfUrl?: string
  error?: string
  tokens_used?: number
  cost_usd?: number
}

/**
 * Calls the generate-mealplan Edge Function to create + email a meal plan.
 * Reuses the same engine as the public website, with coach_id for SMTP override.
 */
export async function sendMealPlan(params: SendMealPlanParams): Promise<SendMealPlanResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  // Get current session token for auth header
  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch(`${supabaseUrl}/functions/v1/generate-mealplan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify(params),
  })

  const data = await res.json()

  if (!res.ok) {
    return { success: false, error: data.error || `HTTP ${res.status}` }
  }

  return {
    success: true,
    mealPlanText: data.mealPlan,
    pdfUrl: data.pdfUrl,
    tokens_used: data.tokens_used,
    cost_usd: data.cost_usd,
  }
}

export async function fetchMealPlanStats(): Promise<{
  totalPlans: number
  totalCost: number
  avgCost: number
  totalTokens: number
}> {
  const { data, error } = await supabase
    .from('generated_meal_plans')
    .select('cost_usd, tokens_used')

  if (error) throw error

  const plans = data || []
  const totalCost = plans.reduce((sum, p) => sum + (p.cost_usd || 0), 0)
  const totalTokens = plans.reduce((sum, p) => sum + (p.tokens_used || 0), 0)

  return {
    totalPlans: plans.length,
    totalCost: Math.round(totalCost * 100) / 100,
    avgCost: plans.length > 0 ? Math.round((totalCost / plans.length) * 100) / 100 : 0,
    totalTokens,
  }
}
