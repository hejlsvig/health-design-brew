import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, ArrowUp, ArrowDown, Eye, EyeOff, Save, Loader2,
  LayoutDashboard, Image as ImageIcon, Utensils, BookOpen, Info,
  Plus, Trash2, Type, HelpCircle, Megaphone, X,
  CheckCircle2, AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import ImageUploader from '@/components/ImageUploader'

interface PageSection {
  id: string
  page: string
  section_type: string
  sort_order: number
  enabled: boolean
  content: Record<string, any>
  updated_at: string
  _isNew?: boolean   // client-only flag
  _deleted?: boolean  // client-only flag
}

/* ─── Section icon map ─── */
const SECTION_ICONS: Record<string, any> = {
  hero: ImageIcon,
  latest_recipes: Utensils,
  latest_articles: BookOpen,
  about: Info,
  content_block: Type,
  faq: HelpCircle,
  cta_banner: Megaphone,
  featured_recipes: Utensils,
  featured_articles: BookOpen,
}

/* ─── Section type → i18n key map ─── */
const SECTION_I18N_KEY: Record<string, string> = {
  hero: 'hero',
  latest_recipes: 'latestRecipes',
  latest_articles: 'latestArticles',
  about: 'about',
  content_block: 'contentBlock',
  faq: 'faq',
  cta_banner: 'ctaBanner',
  featured_recipes: 'featuredRecipes',
  featured_articles: 'featuredArticles',
}

const SECTION_EDITABLE: Record<string, boolean> = {
  hero: true, latest_recipes: true, latest_articles: true, about: true,
  content_block: true, faq: true, cta_banner: true,
  featured_recipes: false, featured_articles: false,
}

const SECTION_DELETABLE: Record<string, boolean> = {
  content_block: true, faq: true, cta_banner: true,
  featured_recipes: true, featured_articles: true,
}

const NEW_SECTION_TYPES = ['content_block', 'faq', 'cta_banner', 'featured_recipes', 'featured_articles']

const EMPTY_CONTENT: Record<string, any> = {
  content_block: { title: { da: '', en: '', se: '' }, text: { da: '', en: '', se: '' }, image: '', layout: 'image_right' },
  faq: { title: { da: 'Ofte stillede spørgsmål', en: 'Frequently Asked Questions', se: 'Vanliga frågor' }, items: [] },
  cta_banner: { tagline: { da: '', en: '', se: '' }, title: { da: '', en: '', se: '' }, text: { da: '', en: '', se: '' }, cta_text: { da: '', en: '', se: '' }, cta_link: '', bg_image: '' },
  featured_recipes: {},
  featured_articles: {},
}

const LANGS = [
  { code: 'da', label: 'DA' },
  { code: 'en', label: 'EN' },
  { code: 'se', label: 'SV' },
]

export default function AdminHomepage() {
  const { t } = useTranslation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [sections, setSections] = useState<PageSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editLang, setEditLang] = useState('da')
  const [dirty, setDirty] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  /* ─── Toast auto-dismiss ─── */
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  /* ─── Unsaved changes warning ─── */
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (dirty) {
      e.preventDefault()
      e.returnValue = t('admin.unsavedWarning')
    }
  }, [dirty, t])

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [handleBeforeUnload])

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/login')
  }, [user, isAdmin, authLoading, navigate])

  useEffect(() => {
    if (isAdmin) fetchSections()
  }, [isAdmin])

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from('page_sections')
      .select('*')
      .eq('page', 'home')
      .order('sort_order')
    if (error) {
      setToast({ type: 'error', message: t('admin.saveError') })
    }
    if (data) setSections(data.map(s => ({ ...s, _isNew: false, _deleted: false })))
    setLoading(false)
  }

  /* ─── Helper: get section label/description from i18n ─── */
  const sectionLabel = (sectionType: string) => {
    const key = SECTION_I18N_KEY[sectionType]
    return key ? t(`admin.sectionLabels.${key}`) : sectionType
  }
  const sectionDescription = (sectionType: string) => {
    const key = SECTION_I18N_KEY[sectionType]
    return key ? t(`admin.sectionDescriptions.${key}`) : ''
  }

  const toggleEnabled = (id: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
    setDirty(true)
  }

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const visible = prev.filter(s => !s._deleted)
      const idx = visible.findIndex(s => s.id === id)
      if (idx < 0) return prev
      const target = direction === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= visible.length) return prev
      const copy = [...visible]
      ;[copy[idx], copy[target]] = [copy[target], copy[idx]]
      return copy.map((s, i) => ({ ...s, sort_order: i }))
    })
    setDirty(true)
  }

  const updateContent = (id: string, key: string, value: any) => {
    setSections(prev => prev.map(s =>
      s.id === id ? { ...s, content: { ...s.content, [key]: value } } : s
    ))
    setDirty(true)
  }

  const updateLocalizedContent = (id: string, key: string, langCode: string, value: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== id) return s
      const existing = s.content[key] || {}
      return { ...s, content: { ...s.content, [key]: { ...existing, [langCode]: value } } }
    }))
    setDirty(true)
  }

  /* ─── Add new section ─── */
  const addSection = (sectionType: string) => {
    const newSection: PageSection = {
      id: `new-${Date.now()}`,
      page: 'home',
      section_type: sectionType,
      sort_order: sections.filter(s => !s._deleted).length,
      enabled: true,
      content: JSON.parse(JSON.stringify(EMPTY_CONTENT[sectionType] || {})),
      updated_at: new Date().toISOString(),
      _isNew: true,
      _deleted: false,
    }
    setSections(prev => [...prev.filter(s => !s._deleted), newSection])
    setExpandedId(newSection.id)
    setShowAddMenu(false)
    setDirty(true)
  }

  /* ─── Delete section ─── */
  const deleteSection = (id: string) => {
    if (!confirm(t('admin.confirmDeleteSection'))) return
    setSections(prev => {
      const section = prev.find(s => s.id === id)
      if (!section) return prev
      if (section._isNew) {
        return prev.filter(s => s.id !== id).map((s, i) => ({ ...s, sort_order: i }))
      }
      return prev.map(s => s.id === id ? { ...s, _deleted: true } : s)
    })
    if (expandedId === id) setExpandedId(null)
    setDirty(true)
  }

  /* ─── Save all ─── */
  const handleSave = async () => {
    setSaving(true)
    try {
      // Delete marked sections
      const toDelete = sections.filter(s => s._deleted && !s._isNew)
      for (const section of toDelete) {
        const { error } = await supabase.from('page_sections').delete().eq('id', section.id)
        if (error) throw error
      }

      // Insert new sections
      const toInsert = sections.filter(s => s._isNew && !s._deleted)
      for (const section of toInsert) {
        const { error } = await supabase.from('page_sections').insert({
          page: section.page,
          section_type: section.section_type,
          sort_order: section.sort_order,
          enabled: section.enabled,
          content: section.content,
        })
        if (error) throw error
      }

      // Update existing sections
      const toUpdate = sections.filter(s => !s._isNew && !s._deleted)
      for (const section of toUpdate) {
        const { error } = await supabase
          .from('page_sections')
          .update({
            sort_order: section.sort_order,
            enabled: section.enabled,
            content: section.content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', section.id)
        if (error) throw error
      }

      // Re-fetch to get real IDs for newly inserted sections
      await fetchSections()
      setDirty(false)
      setToast({ type: 'success', message: t('admin.saveSuccess') })
    } catch (err: any) {
      console.error('Save error:', err)
      setToast({ type: 'error', message: `${t('admin.saveError')}: ${err.message || ''}` })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return <div className="container py-20 text-center text-muted-foreground">{t('common.loading')}</div>
  }
  if (!isAdmin) return null

  const visibleSections = sections.filter(s => !s._deleted)

  return (
    <div className="container py-8 max-w-3xl">
      {/* Toast notification */}
      {toast && (
        <div className={cn(
          'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium shadow-lg transition-all animate-in slide-in-from-top-2',
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (dirty && !confirm(t('admin.unsavedWarning'))) return
              navigate('/admin')
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin
          </button>
          <h1 className="font-serif text-2xl font-bold text-primary">{t('admin.homepageTitle')}</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className={cn(
            'inline-flex h-9 items-center gap-2 px-5 rounded-md font-bold text-sm transition-colors',
            dirty
              ? 'bg-accent text-accent-foreground hover:bg-accent/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('admin.savingChanges')}</> : <><Save className="h-4 w-4" /> {t('admin.saveChanges')}</>}
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {t('admin.homepageDescription')}
      </p>

      {/* Language tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-muted rounded-md w-fit">
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => setEditLang(l.code)}
            className={cn(
              'px-3 py-1.5 rounded text-xs font-bold transition-colors',
              editLang === l.code
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Section list */}
      <div className="space-y-3">
        {visibleSections.map((section, idx) => {
          const Icon = SECTION_ICONS[section.section_type] || LayoutDashboard
          const editable = SECTION_EDITABLE[section.section_type] ?? false
          const deletable = SECTION_DELETABLE[section.section_type] ?? false
          const isExpanded = expandedId === section.id

          return (
            <div
              key={section.id}
              className={cn(
                'rounded-md border transition-all',
                section.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30 opacity-60',
                isExpanded && 'ring-1 ring-accent'
              )}
            >
              {/* Section header */}
              <div className="flex items-center gap-3 p-4">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveSection(section.id, 'up')}
                    disabled={idx === 0}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveSection(section.id, 'down')}
                    disabled={idx === visibleSections.length - 1}
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-colors"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                <div className={cn('flex h-9 w-9 items-center justify-center rounded-md', section.enabled ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground')}>
                  <Icon className="h-4 w-4" />
                </div>

                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : section.id)}
                >
                  <h3 className="text-sm font-bold text-foreground">{sectionLabel(section.section_type)}</h3>
                  <p className="text-xs text-muted-foreground">{sectionDescription(section.section_type)}</p>
                </div>

                {deletable && (
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-2 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    title={t('admin.deleteSection')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => toggleEnabled(section.id)}
                  className={cn(
                    'p-2 rounded-md transition-colors',
                    section.enabled
                      ? 'text-accent hover:bg-accent/10'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                  title={section.enabled ? t('admin.sectionEnabled') : t('admin.sectionDisabled')}
                >
                  {section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>

              {/* Expanded editor panel */}
              {isExpanded && editable && (
                <div className="border-t border-border p-4 space-y-4 bg-muted/20">
                  {section.section_type === 'hero' && (
                    <HeroEditor section={section} lang={editLang} updateLocalized={updateLocalizedContent} updateContent={updateContent} t={t} />
                  )}
                  {section.section_type === 'latest_recipes' && (
                    <CountEditor section={section} updateContent={updateContent} label={t('admin.fields.recipesCount')} />
                  )}
                  {section.section_type === 'latest_articles' && (
                    <CountEditor section={section} updateContent={updateContent} label={t('admin.fields.studiesCount')} />
                  )}
                  {section.section_type === 'about' && (
                    <AboutEditor section={section} lang={editLang} updateLocalized={updateLocalizedContent} updateContent={updateContent} t={t} />
                  )}
                  {section.section_type === 'content_block' && (
                    <ContentBlockEditor section={section} lang={editLang} updateLocalized={updateLocalizedContent} updateContent={updateContent} t={t} />
                  )}
                  {section.section_type === 'faq' && (
                    <FaqEditor section={section} lang={editLang} updateLocalized={updateLocalizedContent} updateContent={updateContent} t={t} />
                  )}
                  {section.section_type === 'cta_banner' && (
                    <CtaBannerEditor section={section} lang={editLang} updateLocalized={updateLocalizedContent} updateContent={updateContent} t={t} />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add section button */}
      <div className="relative mt-4">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full h-12 rounded-md border-2 border-dashed border-border hover:border-accent/50 hover:bg-accent/5 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-accent"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-bold">{t('admin.addSection')}</span>
        </button>

        {showAddMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-md shadow-lg z-20 overflow-hidden">
              {NEW_SECTION_TYPES.map(sType => {
                const Icon = SECTION_ICONS[sType] || LayoutDashboard
                return (
                  <button
                    key={sType}
                    onClick={() => addSection(sType)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10 text-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{sectionLabel(sType)}</p>
                      <p className="text-xs text-muted-foreground">{sectionDescription(sType)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   EDITORS
   ═══════════════════════════════════════════════════ */

/* ─── Hero Editor ─── */
function HeroEditor({ section, lang, updateLocalized, updateContent, t }: EditorProps) {
  const c = section.content
  return (
    <div className="space-y-3">
      <Field label={t('admin.fields.tagline')} value={c.tagline?.[lang] || ''} onChange={v => updateLocalized(section.id, 'tagline', lang, v)} />
      <Field label={t('admin.fields.title')} value={c.title?.[lang] || ''} onChange={v => updateLocalized(section.id, 'title', lang, v)} />
      <Field label={t('admin.fields.subtitle')} value={c.subtitle?.[lang] || ''} onChange={v => updateLocalized(section.id, 'subtitle', lang, v)} textarea />
      <Field label={t('admin.fields.ctaButtonText')} value={c.cta_text?.[lang] || ''} onChange={v => updateLocalized(section.id, 'cta_text', lang, v)} />
      <Field label={t('admin.fields.ctaLink')} value={c.cta_link || ''} onChange={v => updateContent(section.id, 'cta_link', v)} />
      <ImageUploader
        label={t('admin.fields.backgroundImage')}
        value={c.bg_image || ''}
        onChange={v => updateContent(section.id, 'bg_image', v)}
        folder="homepage"
      />
    </div>
  )
}

/* ─── About Editor ─── */
function AboutEditor({ section, lang, updateLocalized, updateContent, t }: EditorProps) {
  const c = section.content
  return (
    <div className="space-y-3">
      <Field label={t('admin.fields.tagline')} value={c.tagline?.[lang] || ''} onChange={v => updateLocalized(section.id, 'tagline', lang, v)} />
      <Field label={t('admin.fields.title')} value={c.title?.[lang] || ''} onChange={v => updateLocalized(section.id, 'title', lang, v)} />
      <Field label={t('admin.fields.description')} value={c.description?.[lang] || ''} onChange={v => updateLocalized(section.id, 'description', lang, v)} textarea />
      <ImageUploader
        label={t('admin.fields.image')}
        value={c.image || ''}
        onChange={v => updateContent(section.id, 'image', v)}
        folder="homepage"
      />
    </div>
  )
}

/* ─── Content Block Editor ─── */
function ContentBlockEditor({ section, lang, updateLocalized, updateContent, t }: EditorProps) {
  const c = section.content
  return (
    <div className="space-y-3">
      <Field label={t('admin.fields.title')} value={c.title?.[lang] || ''} onChange={v => updateLocalized(section.id, 'title', lang, v)} />
      <Field label={t('admin.fields.bodyText')} value={c.text?.[lang] || ''} onChange={v => updateLocalized(section.id, 'text', lang, v)} textarea rows={4} />
      <ImageUploader
        label={t('admin.fields.imageOptional')}
        value={c.image || ''}
        onChange={v => updateContent(section.id, 'image', v)}
        folder="homepage"
      />
      <div>
        <label className="block text-xs font-medium mb-1">{t('admin.fields.layout')}</label>
        <div className="flex gap-2">
          {(['image_right', 'image_left'] as const).map(layout => (
            <button
              key={layout}
              onClick={() => updateContent(section.id, 'layout', layout)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-bold border transition-colors',
                c.layout === layout
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/50'
              )}
            >
              {layout === 'image_right' ? t('admin.fields.imageRight') : t('admin.fields.imageLeft')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── FAQ Editor ─── */
function FaqEditor({ section, lang, updateLocalized, updateContent, t }: EditorProps) {
  const c = section.content
  const items: Array<{ question: Record<string, string>; answer: Record<string, string> }> = c.items || []

  const updateItem = (index: number, field: 'question' | 'answer', value: string) => {
    const newItems = items.map((item, i) => {
      if (i !== index) return item
      return { ...item, [field]: { ...item[field], [lang]: value } }
    })
    updateContent(section.id, 'items', newItems)
  }

  const addItem = () => {
    const newItems = [...items, { question: { da: '', en: '', se: '' }, answer: { da: '', en: '', se: '' } }]
    updateContent(section.id, 'items', newItems)
  }

  const removeItem = (index: number) => {
    updateContent(section.id, 'items', items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <Field label={t('admin.fields.sectionTitle')} value={c.title?.[lang] || ''} onChange={v => updateLocalized(section.id, 'title', lang, v)} />

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="p-3 rounded-md border border-border bg-background space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground">{t('admin.faq.question')} {idx + 1}</span>
              <button
                onClick={() => removeItem(idx)}
                className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={item.question?.[lang] || ''}
              onChange={e => updateItem(idx, 'question', e.target.value)}
              placeholder={t('admin.faq.questionPlaceholder')}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
              value={item.answer?.[lang] || ''}
              onChange={e => updateItem(idx, 'answer', e.target.value)}
              placeholder={t('admin.faq.answerPlaceholder')}
              rows={2}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-border text-xs font-bold text-muted-foreground hover:border-accent hover:text-accent transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('admin.faq.addQuestion')}
      </button>
    </div>
  )
}

/* ─── CTA Banner Editor ─── */
function CtaBannerEditor({ section, lang, updateLocalized, updateContent, t }: EditorProps) {
  const c = section.content
  return (
    <div className="space-y-3">
      <Field label={t('admin.fields.tagline')} value={c.tagline?.[lang] || ''} onChange={v => updateLocalized(section.id, 'tagline', lang, v)} />
      <Field label={t('admin.fields.title')} value={c.title?.[lang] || ''} onChange={v => updateLocalized(section.id, 'title', lang, v)} />
      <Field label={t('admin.fields.text')} value={c.text?.[lang] || ''} onChange={v => updateLocalized(section.id, 'text', lang, v)} textarea />
      <Field label={t('admin.fields.ctaButtonText')} value={c.cta_text?.[lang] || ''} onChange={v => updateLocalized(section.id, 'cta_text', lang, v)} />
      <Field label={t('admin.fields.ctaLink')} value={c.cta_link || ''} onChange={v => updateContent(section.id, 'cta_link', v)} />
      <ImageUploader
        label={t('admin.fields.backgroundImage')}
        value={c.bg_image || ''}
        onChange={v => updateContent(section.id, 'bg_image', v)}
        folder="homepage"
      />
    </div>
  )
}

/* ─── Count Editor ─── */
function CountEditor({ section, updateContent, label }: {
  section: PageSection; updateContent: (id: string, key: string, value: any) => void; label: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input
        type="number"
        min={1}
        max={12}
        value={section.content.count || 3}
        onChange={e => updateContent(section.id, 'count', parseInt(e.target.value) || 3)}
        className="w-20 h-9 rounded-md border border-input bg-background px-3 text-sm text-center focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   SHARED TYPES & HELPERS
   ═══════════════════════════════════════════════════ */

interface EditorProps {
  section: PageSection
  lang: string
  updateLocalized: (id: string, key: string, lang: string, value: string) => void
  updateContent: (id: string, key: string, value: any) => void
  t: (key: string) => string
}

function Field({ label, value, onChange, textarea, placeholder, rows }: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string; rows?: number
}) {
  const cls = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring'
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows || 2} className={cn(cls, 'resize-y')} placeholder={placeholder} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} className={cn(cls, 'h-9')} placeholder={placeholder} />
      )}
    </div>
  )
}
