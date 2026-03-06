import { supabase } from './supabase'

export interface DashboardStats {
  totalLeads: number
  newThisWeek: number
  qualified: number
  activeCoaching: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data: allLeads, error: leadsError } = await supabase
    .from('lead_status')
    .select('status, created_at')

  if (leadsError) throw leadsError

  const leads = allLeads || []
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  return {
    totalLeads: leads.length,
    newThisWeek: leads.filter(
      (l) => new Date(l.created_at) >= oneWeekAgo
    ).length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    activeCoaching: leads.filter((l) => l.status === 'coaching_active').length,
  }
}
