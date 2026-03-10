import { supabase } from './supabase'

export interface NewsletterSubscriber {
  id: string
  email: string
  name: string | null
  is_active: boolean
  source: string | null
  linked_user_id: string | null
  language: string | null
  ip_address: string | null
  tags: string[] | null
  created_at: string
  unsubscribed_at: string | null
}

export async function fetchNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as NewsletterSubscriber[]
}

export async function toggleSubscriberActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({
      is_active: isActive,
      unsubscribed_at: isActive ? null : new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}
