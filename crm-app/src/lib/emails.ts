import { supabase } from './supabase'

export interface EmailSend {
  id: string
  user_id: string | null
  email_address: string
  template_id: string | null
  subject: string
  email_type: string
  status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'opened' | 'clicked' | 'failed'
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounce_reason: string | null
  created_at: string
}

export interface EmailTemplate {
  id: string
  name: string
  email_type: string
  subject: Record<string, string>   // { da, en, se }
  body_html: Record<string, string> // { da, en, se }
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Email Sends ───

export async function fetchEmailsForUser(userId: string): Promise<EmailSend[]> {
  // Try by user_id first
  const { data, error } = await supabase
    .from('email_sends')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (!error && data && data.length > 0) {
    return data as EmailSend[]
  }

  // Also try by subscriber_id (for subscriber-only leads)
  const { data: subData } = await supabase
    .from('email_sends')
    .select('*')
    .eq('subscriber_id', userId)
    .order('created_at', { ascending: false })

  return (subData || []) as EmailSend[]
}

export async function fetchAllEmails(limit = 100): Promise<EmailSend[]> {
  const { data, error } = await supabase
    .from('email_sends')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as EmailSend[]
}

// ─── Email Templates ───

export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('name')

  if (error) throw error
  return (data || []) as EmailTemplate[]
}

export async function fetchEmailTemplateById(id: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data as EmailTemplate | null
}

export async function createEmailTemplate(template: {
  name: string
  email_type: string
  subject: Record<string, string>
  body_html: Record<string, string>
  variables?: string[]
}): Promise<void> {
  const { error } = await supabase
    .from('email_templates')
    .insert({
      ...template,
      variables: template.variables || [],
      is_active: true,
    })

  if (error) throw error
}

export async function updateEmailTemplate(
  id: string,
  updates: Partial<EmailTemplate>
): Promise<void> {
  const { error } = await supabase
    .from('email_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}
