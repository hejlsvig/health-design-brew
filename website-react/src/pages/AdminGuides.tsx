import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, Edit3, Trash2, Eye, ArrowLeft, Save, X, Globe,
  Loader2, ImagePlus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import TiptapEditor from '@/components/TiptapEditor'
import { processImage, getProcessingOptions, formatBytes } from '@/lib/imageProcessing'
import ImagePreviewWithSafeZone from '@/components/ImagePreviewWithSafeZone'

interface Guide {
  id: string
  slug: string
  title: Record<string, string>
  summary: Record<string, string> | null
  content: Record<string, string>
  category: 'keto' | 'fasting' | 'lifestyle'
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  reading_time: number | null
  status: 'draft' | 'published' | 'archived'
  featured_image: string | null
  published_at: string | null
  seo_title: Record<string, string> | null
  seo_description: Record<string, string> | null
  created_at: string
  updated_at: string
}

type EditorGuide = Omit<Guide, 'id' | 'created_at' | 'updated_at'>

const EMPTY_GUIDE: EditorGuide = {
  slug: '',
  title: { da: '', en: '', se: '' },
  summary: { da: '', en: '', se: '' },
  content: { da: '', en: '', se: '' },
  category: 'keto',
  tags: [],
  difficulty: 'beginner',
  reading_time: 5,
  status: 'draft',
  featured_image: '',
  published_at: null,
  seo_title: { da: '', en: '', se: '' },
  seo_description: { da: '', en: '', se: '' },
}

const LANGS = [
  { code: 'da', label: 'Dansk' },
  { code: 'en', label: 'English' },
  { code: 'se', label: 'Svenska' },
]

export default function AdminGuides() {
  const { t } = useTranslation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditorGuide>(EMPTY_GUIDE)
  const [editorLang, setEditorLang] = useState('da')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{ originalSize: number; compressedSize: number; format: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const uploadingRef = useRef(false)

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login')
    }
  }, [user, isAdmin, authLoading, navigate])

  useEffect(() => {
    if (isAdmin) fetchGuides()
  }, [isAdmin])

  // Open editor if ?edit=slug is in URL
  useEffect(() => {
    const editSlug = searchParams.get('edit')
    if (editSlug && guides.length > 0 && view === 'list') {
      const match = guides.find(g => g.slug === editSlug)
      if (match) {
        openEdit(match)
        setSearchParams({}, { replace: true })
      }
    }
  }, [guides, searchParams])

  const fetchGuides = async () => {
    const { data, error: fetchError } = await supabase
      .from('guides')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!fetchError && data) {
      setGuides(data)
    }
    setLoading(false)
  }

  // --- List Actions ---

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY_GUIDE)
    setTagsInput('')
    setEditorLang('da')
    setError('')
    setView('editor')
  }

  const openEdit = (guide: Guide) => {
    setEditingId(guide.id)
    setForm({
      slug: guide.slug,
      title: guide.title || { da: '', en: '', se: '' },
      summary: guide.summary || { da: '', en: '', se: '' },
      content: guide.content || { da: '', en: '', se: '' },
      category: guide.category,
      tags: guide.tags || [],
      difficulty: guide.difficulty,
      reading_time: guide.reading_time || 5,
      status: guide.status,
      featured_image: guide.featured_image || '',
      published_at: guide.published_at,
      seo_title: guide.seo_title || { da: '', en: '', se: '' },
      seo_description: guide.seo_description || { da: '', en: '', se: '' },
    })
    setTagsInput((guide.tags || []).join(', '))
    setEditorLang('da')
    setError('')
    setView('editor')
  }

  const deleteGuide = async (id: string) => {
    if (!confirm(t('admin.confirmDelete'))) return
    await supabase.from('guides').delete().eq('id', id)
    setGuides(prev => prev.filter(g => g.id !== id))
  }

  // --- Image Upload ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (uploadingRef.current) {
      console.warn('[Upload] Upload already in progress — skipping duplicate call')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError(t('admin.errorImageType'))
      return
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Billedet skal være under 20 MB')
      return
    }

    uploadingRef.current = true
    setImageProcessing(true)
    setError('')
    setCompressionInfo(null)

    try {
      console.log('[Upload] Processing:', file.name, formatBytes(file.size))

      // 1. Resize + compress (16:9 for guides)
      const options = getProcessingOptions('guides')
      let processedBlob: Blob = file
      let processedFormat = file.name.split('.').pop()?.toLowerCase() || 'jpg'

      try {
        const processed = await processImage(file, options)
        processedBlob = processed.blob
        processedFormat = processed.format
        setCompressionInfo({ originalSize: processed.originalSize, compressedSize: processed.compressedSize, format: processed.format })
        console.log('[Upload] Compressed:', formatBytes(processed.originalSize), '→', formatBytes(processed.compressedSize))
      } catch (procErr) {
        console.warn('[Upload] Processing failed, uploading original:', procErr)
      }

      // 2. Upload processed blob
      setImageProcessing(false)
      setImageUploading(true)

      const ext = processedFormat === 'webp' ? 'webp' : processedFormat
      const timestamp = Date.now()
      const safeName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .substring(0, 50)
      const filePath = `guides/${timestamp}-${safeName}.${ext}`

      const uploadPromise = supabase.storage
        .from('images')
        .upload(filePath, processedBlob, {
          cacheControl: '3600',
          upsert: false,
        })

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timed out after 30 seconds')), 30000)
      )

      const { data, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise])
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(data.path)

      setForm(prev => ({ ...prev, featured_image: urlData.publicUrl }))
      console.log('[Upload] Success:', urlData.publicUrl)
    } catch (err: any) {
      console.error('[Upload] Error:', err)
      setError(`Upload failed: ${err.message}`)
    } finally {
      setImageUploading(false)
      setImageProcessing(false)
      uploadingRef.current = false
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = () => {
    setForm(prev => ({ ...prev, featured_image: '' }))
    setCompressionInfo(null)
  }

  // --- Editor Actions ---

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'oe').replace(/[å]/g, 'aa')
      .replace(/[ä]/g, 'ae').replace(/[ö]/g, 'oe')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const updateLocalizedField = (
    field: 'title' | 'summary' | 'content' | 'seo_title' | 'seo_description',
    value: string
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: { ...(prev[field] as Record<string, string>), [editorLang]: value },
    }))

    if (field === 'title' && editorLang === 'da' && !editingId) {
      setForm(prev => ({ ...prev, slug: generateSlug(value) }))
    }
  }

  const getFieldValue = (
    field: 'title' | 'summary' | 'content' | 'seo_title' | 'seo_description'
  ): string => {
    const obj = form[field] as Record<string, string> | null
    return obj?.[editorLang] || ''
  }

  // --- Save ---

  const handleSave = async () => {
    // Prevent re-entrant / duplicate saves
    if (savingRef.current) {
      console.warn('[AdminGuides] Save already in progress — skipping duplicate call')
      return
    }

    setError('')

    if (!form.slug) {
      setError(t('admin.errorSlug'))
      return
    }
    if (!form.title.da && !form.title.en) {
      setError(t('admin.errorTitle'))
      return
    }

    setSaving(true)
    savingRef.current = true

    try {
      const parsedTags = tagsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

      const payload = {
        slug: form.slug,
        title: form.title,
        summary: form.summary,
        content: form.content,
        category: form.category,
        tags: parsedTags,
        difficulty: form.difficulty,
        reading_time: form.reading_time || 5,
        status: form.status,
        featured_image: form.featured_image || null,
        published_at: form.status === 'published'
          ? form.published_at || new Date().toISOString()
          : form.published_at,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        created_by: user?.id || null,
      }

      console.log('[AdminGuides] Saving guide:', payload.slug, payload.status)

      let result
      if (editingId) {
        result = await supabase
          .from('guides')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()
      } else {
        result = await supabase
          .from('guides')
          .insert(payload)
          .select()
          .single()
      }

      console.log('[AdminGuides] Save result:', result)

      if (result.error) {
        console.error('[AdminGuides] Save error:', result.error)
        setError(result.error.message)
        setSaving(false)
        savingRef.current = false
        return
      }

      await fetchGuides()
      setView('list')
    } catch (err: any) {
      console.error('[AdminGuides] Unexpected error:', err)
      setError(err?.message || 'Unexpected error')
    } finally {
      setSaving(false)
      savingRef.current = false
    }
  }

  // --- Render ---

  if (authLoading || loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (!isAdmin) return null

  // ─── Editor View ──────────────────────────────────────────────
  if (view === 'editor') {
    return (
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('admin.backToList')}
          </button>
          <h1 className="font-serif text-2xl font-bold text-primary">
            {editingId ? t('admin.editGuide') : t('admin.newGuide')}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Language Tabs */}
          <div className="flex gap-1 border-b border-border">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => setEditorLang(l.code)}
                className={cn(
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                  editorLang === l.code
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('admin.fieldTitle')} ({editorLang.toUpperCase()})
            </label>
            <input
              type="text"
              value={getFieldValue('title')}
              onChange={e => updateLocalizedField('title', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('admin.fieldTitle')}
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('admin.fieldSummary')} ({editorLang.toUpperCase()})
            </label>
            <textarea
              value={getFieldValue('summary')}
              onChange={e => updateLocalizedField('summary', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder={t('admin.fieldSummary')}
            />
          </div>

          {/* Content — WYSIWYG */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('admin.fieldContent')} ({editorLang.toUpperCase()})
            </label>
            <TiptapEditor
              content={getFieldValue('content')}
              onChange={(html) => updateLocalizedField('content', html)}
              placeholder={t('admin.fieldContent')}
            />
          </div>

          {/* Slug + Category + Difficulty + Status row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldSlug')}</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldCategory')}</label>
              <select
                value={form.category}
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value as 'keto' | 'fasting' | 'lifestyle' }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="keto">Keto</option>
                <option value="fasting">Fasting</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldDifficulty')}</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="beginner">{t('admin.difficultyEasy')}</option>
                <option value="intermediate">{t('admin.difficultyMedium')}</option>
                <option value="advanced">{t('admin.difficultyHard')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldStatus')}</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value as 'draft' | 'published' | 'archived' }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="draft">{t('admin.statusDraft')}</option>
                <option value="published">{t('admin.statusPublished')}</option>
                <option value="archived">{t('admin.statusArchived')}</option>
              </select>
            </div>
          </div>

          {/* Tags + Reading Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldTags')}</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="keto, nutrition, meal-prep"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('admin.tagsHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldReadingTime')}</label>
              <input
                type="number"
                min="1"
                value={form.reading_time || 5}
                onChange={e => setForm(prev => ({ ...prev, reading_time: parseInt(e.target.value) || 5 }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.fieldImage')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            {form.featured_image ? (
              <ImagePreviewWithSafeZone
                imageSrc={form.featured_image}
                aspectRatio="16/9"
                originalSize={compressionInfo?.originalSize}
                compressedSize={compressionInfo?.compressedSize}
                format={compressionInfo?.format}
                onReplace={() => fileInputRef.current?.click()}
                onRemove={removeImage}
              />
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={imageUploading || imageProcessing}
                className="w-full h-32 rounded-md border-2 border-dashed border-input hover:border-primary/50 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
              >
                {imageProcessing ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">Forbereder billede...</span>
                  </>
                ) : imageUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="text-sm">{t('admin.uploading')}</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-sm">{t('admin.clickToUpload')}</span>
                    <span className="text-xs">Resizes automatisk — JPG, PNG, WebP</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* SEO */}
          <details className="rounded-md border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" />
              SEO ({editorLang.toUpperCase()})
            </summary>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin.fieldSeoTitle')}</label>
                <input
                  type="text"
                  value={getFieldValue('seo_title')}
                  onChange={e => updateLocalizedField('seo_title', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('admin.fieldSeoDescription')}</label>
                <textarea
                  value={getFieldValue('seo_description')}
                  onChange={e => updateLocalizedField('seo_description', e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                />
              </div>
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 px-6 rounded-md bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('admin.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('admin.save')}
                </>
              )}
            </button>
            <button
              onClick={() => setView('list')}
              className="inline-flex h-10 items-center gap-2 px-6 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
              {t('admin.cancel')}
            </button>
            {editingId && (
              <a
                href={`/guides/${form.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-2 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
              >
                <Eye className="h-4 w-4" />
                {t('admin.preview')}
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── List View ────────────────────────────────────────────────
  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-primary">
          {t('admin.guidesTitle')}
        </h1>
        <button
          onClick={openNew}
          className="inline-flex h-10 items-center gap-2 px-5 rounded-md bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('admin.newGuide')}
        </button>
      </div>

      {guides.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>{t('admin.noGuides')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {guides.map(guide => (
            <div
              key={guide.id}
              className="flex items-center justify-between p-4 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                    guide.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : guide.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {guide.status}
                  </span>
                  <span className="text-[10px] uppercase font-medium text-muted-foreground">
                    {guide.category}
                  </span>
                  <span className="text-[10px] uppercase font-medium text-muted-foreground">
                    {guide.difficulty}
                  </span>
                </div>
                <h3 className="font-medium text-sm truncate">
                  {guide.title?.da || guide.title?.en || t('admin.untitled')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  /{guide.slug} — {new Date(guide.updated_at).toLocaleDateString('da-DK')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {guide.status === 'published' && (
                  <a
                    href={`/guides/${guide.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={t('admin.preview')}
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => openEdit(guide)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={t('admin.edit')}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteGuide(guide.id)}
                  className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title={t('admin.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
