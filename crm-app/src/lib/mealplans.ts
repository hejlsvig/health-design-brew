import { supabase } from './supabase'

export interface MealPlan {
  id: string
  profile_id: string
  pdf_filename: string
  pdf_storage_path: string | null
  tokens_used: number | null
  cost_usd: number | null
  model: string
  num_days: number | null
  created_at: string
}

export async function fetchMealPlansForUser(userId: string): Promise<MealPlan[]> {
  const { data, error } = await supabase
    .from('generated_meal_plans')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as MealPlan[]
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
