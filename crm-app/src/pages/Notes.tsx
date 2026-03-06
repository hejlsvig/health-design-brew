import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchNotes, createNote, deleteNote, togglePinNote,
  type CrmNote, type NoteCategory, NOTE_CATEGORIES, CATEGORY_COLORS,
} from '@/lib/notes'
import {
  Loader2, StickyNote, Plus, Pin, PinOff, Trash2, X,
} from 'lucide-react'

export default function Notes() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [notes, setNotes] = useState<CrmNote[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<NoteCategory | ''>('')
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<NoteCategory>('general')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadNotes()
  }, [categoryFilter])

  async function loadNotes() {
    setLoading(true)
    try {
      const data = await fetchNotes({
        category: categoryFilter || undefined,
        search: search || undefined,
      })
      setNotes(data)
    } catch (err) {
      console.error('Load notes error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateNote() {
    if (!user || !newContent.trim()) return
    setSaving(true)
    try {
      await createNote({
        created_by: user.id,
        title: newTitle.trim() || undefined,
        content: newContent.trim(),
        category: newCategory,
      })
      setNewTitle('')
      setNewContent('')
      setNewCategory('general')
      setShowNew(false)
      await loadNotes()
    } catch (err) {
      console.error('Create note error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await deleteNote(noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
    } catch (err) {
      console.error('Delete note error:', err)
    }
  }

  async function handlePin(noteId: string, isPinned: boolean) {
    try {
      await togglePinNote(noteId, isPinned)
      setNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, is_pinned: isPinned } : n))
    } catch (err) {
      console.error('Pin note error:', err)
    }
  }

  const filteredNotes = search
    ? notes.filter((n) =>
        n.content.toLowerCase().includes(search.toLowerCase()) ||
        n.title?.toLowerCase().includes(search.toLowerCase())
      )
    : notes

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-foreground">{t('notes.title')}</h1>
        <button
          onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('notes.newNote')}
        </button>
      </div>

      {/* New note form */}
      {showNew && (
        <div className="bg-card rounded-xl border border-border p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">{t('notes.newNote')}</h3>
            <button onClick={() => setShowNew(false)} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('notes.titlePlaceholder')}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={t('notes.contentPlaceholder')}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
          />
          <div className="flex items-center gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as NoteCategory)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
            >
              {NOTE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{t(`notes.categories.${cat}`)}</option>
              ))}
            </select>
            <button
              onClick={handleCreateNote}
              disabled={saving || !newContent.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('notes.search')}
          className="flex-1 min-w-[200px] px-4 py-2.5 rounded-lg border border-border bg-card text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as NoteCategory | '')}
          className="px-3 py-2.5 rounded-lg border border-border bg-card text-sm"
        >
          <option value="">{t('notes.allCategories')}</option>
          {NOTE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{t(`notes.categories.${cat}`)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div key={note.id} className={`p-4 rounded-xl border bg-card ${note.is_pinned ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
              <div className="flex items-start gap-3">
                <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {note.title && (
                    <p className="text-sm font-medium text-foreground mb-1">{note.title}</p>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${CATEGORY_COLORS[note.category]}`}>
                      {t(`notes.categories.${note.category}`)}
                    </span>
                    {note.profile && (
                      <span className="text-xs text-muted-foreground">
                        → {note.profile.name || note.profile.email}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                    {note.creator && (
                      <span className="text-xs text-muted-foreground">
                        by {note.creator.name || note.creator.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handlePin(note.id, !note.is_pinned)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    {note.is_pinned
                      ? <PinOff className="w-3.5 h-3.5 text-primary" />
                      : <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredNotes.length === 0 && (
            <p className="text-center text-muted-foreground py-12">{t('notes.noNotes')}</p>
          )}
        </div>
      )}
    </div>
  )
}
