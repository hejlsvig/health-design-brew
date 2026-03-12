import { supabase } from './supabase'

export interface DashboardStats {
  totalLeads: number
  newThisWeek: number
  qualified: number
  activeCoaching: number
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  // Fetch authenticated leads
  const { data: allLeads, error: leadsError } = await supabase
    .from('lead_status')
    .select('status, created_at')

  if (leadsError) throw leadsError

  // Fetch guest subscriber-leads (contact_ok, no linked user)
  const { data: subLeads } = await supabase
    .from('newsletter_subscribers')
    .select('created_at, email')
    .contains('tags', ['contact_ok'])
    .eq('is_active', true)
    .is('linked_user_id', null)

  // Fetch actual active coaching count from coaching_clients (source of truth)
  const { count: coachingCount } = await supabase
    .from('coaching_clients')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const leads = allLeads || []
  const subs = subLeads || []
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const subscriberCount = subs.length
  const subscriberNewThisWeek = subs.filter(
    (s) => new Date(s.created_at) >= oneWeekAgo
  ).length

  return {
    totalLeads: leads.length + subscriberCount,
    newThisWeek: leads.filter(
      (l) => new Date(l.created_at) >= oneWeekAgo
    ).length + subscriberNewThisWeek,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    activeCoaching: coachingCount || 0,
  }
}
