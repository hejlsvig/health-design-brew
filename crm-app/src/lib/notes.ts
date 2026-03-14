import { supabase } from './supabase'

export type NoteCategory = 'general' | 'coaching' | 'sales' | 'support' | 'internal' | 'followup'

export interface CrmNote {
  id: string
  lead_id: string | null
  created_by: string
  title: string | null
  content: string
  category: NoteCategory
  priority: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  profile?: { name: string | null; email: string } | null
  creator?: { name: string | null; email: string } | null
}

export interface NoteFilters {
  leadId?: string
  category?: NoteCategory
  search?: string
  pinnedOnly?: boolean
}

export async function fetchNotes(filters?: NoteFilters, limit = 100): Promise<CrmNote[]> {
  let query = supabase
    .from('crm_notes')
    .select(`
      *,
      profile:profiles!crm_notes_lead_id_fkey (name, email),
      creator:profiles!crm_notes_created_by_fkey (name, email)
    `)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filters?.leadId) query = query.eq('lead_id', filters.leadId)
  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.pinnedOnly) query = query.eq('is_pinned', true)

  const { data, error } = await query
  if (error) throw error

  let results = (data || []) as unknown as CrmNote[]

  if (filters?.search) {
    const s = filters.search.toLowerCase()
    results = results.filter((n) =>
      n.content.toLowerCase().includes(s) ||
      n.title?.toLowerCase().includes(s) ||
      n.profile?.name?.toLowerCase().includes(s) ||
      n.profile?.email?.toLowerCase().includes(s)
    )
  }

  return results
}

export async function createNote(note: {
  lead_id?: string
  created_by: string
  title?: string
  content: string
  category?: NoteCategory
}): Promise<CrmNote> {
  const { data, error } = await supabase
    .from('crm_notes')
    .insert({
      lead_id: note.lead_id || null,
      created_by: note.created_by,
      title: note.title || null,
      content: note.content,
      category: note.category || 'general',
    })
    .select()
    .single()

  if (error) throw error
  return data as CrmNote
}

export async function updateNote(noteId: string, updates: { title?: string; content?: string; category?: NoteCategory; is_pinned?: boolean }): Promise<void> {
  const { error } = await supabase
    .from('crm_notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', noteId)

  if (error) throw error
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase
    .from('crm_notes')
    .delete()
    .eq('id', noteId)

  if (error) throw error
}

export async function togglePinNote(noteId: string, isPinned: boolean): Promise<void> {
  const { error } = await supabase
    .from('crm_notes')
    .update({ is_pinned: isPinned })
    .eq('id', noteId)

  if (error) throw error
}

export const NOTE_CATEGORIES: NoteCategory[] = ['general', 'coaching', 'sales', 'support', 'internal', 'followup']

export const CATEGORY_COLORS: Record<NoteCategory, string> = {
  general: 'bg-gray-100 text-gray-700',
  coaching: 'bg-blue-100 text-blue-700',
  sales: 'bg-green-100 text-green-700',
  support: 'bg-orange-100 text-orange-700',
  internal: 'bg-purple-100 text-purple-700',
  followup: 'bg-amber-100 text-amber-700',
}
