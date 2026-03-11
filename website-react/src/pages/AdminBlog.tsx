import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, Edit3, Trash2, Eye, ArrowLeft, Save, X, Globe,
  Sparkles, Loader2, ImagePlus, Star, Share2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import TiptapEditor from '@/components/TiptapEditor'
import { generateArticle, getSettings, fetchUrlContent } from '@/lib/openai'
import { ARTICLE_CATEGORIES, getCategoryLabel } from '@/lib/articleCategories'
import { processImage, getProcessingOptions, formatBytes } from '@/lib/imageProcessing'
import ImagePreviewWithSafeZone from '@/components/ImagePreviewWithSafeZone'
import SocialShareModal from '@/components/SocialShareModal'
import AiImageGenerator from '@/components/AiImageGenerator'
import VideoUploader from '@/components/VideoUploader'

interface Article {
  id: string
  slug: string
  title: Record<string, string>
  content: Record<string, string>
  summary: Record<string, string> | null
  source_url: string | null
  source_title: string | null
  categories: string[]
  tags: string[]
  status: 'draft' | 'published' | 'archived'
  featured_image: string | null
  featured: boolean
  published_at: string | null
  original_published_at: string | null
  seo_title: Record<string, string> | null
  seo_description: Record<string, string> | null
  video_url: Record<string, string> | null
  video_type: string
  created_at: string
  updated_at: string
}

type EditorArticle = Omit<Article, 'id' | 'created_at' | 'updated_at'>

const EMPTY_ARTICLE: EditorArticle = {
  slug: '',
  title: { da: '', en: '', se: '' },
  content: { da: '', en: '', se: '' },
  summary: { da: '', en: '', se: '' },
  source_url: '',
  source_title: '',
  categories: ['keto'],
  tags: [],
  status: 'draft',
  featured: false,
  featured_image: '',
  published_at: null,
  original_published_at: null,
  seo_title: { da: '', en: '', se: '' },
  seo_description: { da: '', en: '', se: '' },
  video_url: null,
  video_type: 'none',
}

const LANGS = [
  { code: 'da', label: 'Dansk' },
  { code: 'en', label: 'English' },
  { code: 'se', label: 'Svenska' },
]

export default function AdminBlog() {
  const { t } = useTranslation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditorArticle>(EMPTY_ARTICLE)
  const [editorLang, setEditorLang] = useState('da')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagsInput, setTagsInput] = useState('')

  // Social share modal
  const [socialShareOpen, setSocialShareOpen] = useState(false)

  // AI generation state
  const [aiSourceUrl, setAiSourceUrl] = useState('')
  const [aiSourceText, setAiSourceText] = useState('')
  const [aiExtraInstructions, setAiExtraInstructions] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiError, setAiError] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [aiFetching, setAiFetching] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{ originalSize: number; compressedSize: number; format: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const uploadingRef = useRef(false)

  // Check if API key is configured
  useEffect(() => {
    if (isAdmin) {
      getSettings().then(s => setHasApiKey(!!s.openai_api_key))
    }
  }, [isAdmin])

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login')
    }
  }, [user, isAdmin, authLoading, navigate])

  useEffect(() => {
    if (isAdmin) fetchArticles()
  }, [isAdmin])

  // Open editor if ?edit=slug is in URL
  useEffect(() => {
    const editSlug = searchParams.get('edit')
    if (editSlug && articles.length > 0 && view === 'list') {
      const match = articles.find(a => a.slug === editSlug)
      if (match) {
        openEdit(match)
        setSearchParams({}, { replace: true })
      }
    }
  }, [articles, searchParams])

  const fetchArticles = async () => {
    const { data, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!fetchError && data) {
      setArticles(data)
    }
    setLoading(false)
  }

  // --- List Actions ---

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY_ARTICLE)
    setTagsInput('')
    setEditorLang('da')
    setError('')
    setAiSourceUrl('')
    setAiSourceText('')
    setAiExtraInstructions('')
    setAiError('')
    setView('editor')
  }

  const openEdit = (article: Article) => {
    setEditingId(article.id)
    setForm({
      slug: article.slug,
      title: article.title || { da: '', en: '', se: '' },
      content: article.content || { da: '', en: '', se: '' },
      summary: article.summary || { da: '', en: '', se: '' },
      source_url: article.source_url || '',
      source_title: article.source_title || '',
      categories: article.categories || ['keto'],
      tags: article.tags || [],
      status: article.status,
      featured: (article as any).featured || false,
      featured_image: article.featured_image || '',
      published_at: article.published_at,
      original_published_at: (article as any).original_published_at || null,
      seo_title: article.seo_title || { da: '', en: '', se: '' },
      seo_description: article.seo_description || { da: '', en: '', se: '' },
      video_url: article.video_url || null,
      video_type: article.video_type || 'none',
    })
    setTagsInput((article.tags || []).join(', '))
    setEditorLang('da')
    setError('')
    setAiError('')
    setView('editor')
  }

  const deleteArticle = async (id: string) => {
    if (!confirm(t('admin.confirmDelete'))) return
    await supabase.from('articles').delete().eq('id', id)
    setArticles(prev => prev.filter(a => a.id !== id))
  }

  // --- Image Upload ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Prevent duplicate uploads
    if (uploadingRef.current) {
      console.warn('[Upload] Upload already in progress — skipping duplicate call')
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError(t('admin.errorImageType'))
      return
    }

    // Allow larger originals since we compress (20 MB limit)
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

      // 1. Resize + compress
      const options = getProcessingOptions('articles')
      let processedBlob: Blob = file
      let processedFormat = file.name.split('.').pop()?.toLowerCase() || 'jpg'

      try {
        const processed = await processImage(file, options)
        processedBlob = processed.blob
        processedFormat = processed.format
        setCompressionInfo({
          originalSize: processed.originalSize,
          compressedSize: processed.compressedSize,
          format: processed.format,
        })
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
      const filePath = `articles/${timestamp}-${safeName}.${ext}`

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

      // Get public URL
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
    field: 'title' | 'content' | 'summary' | 'seo_title' | 'seo_description',
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
    field: 'title' | 'content' | 'summary' | 'seo_title' | 'seo_description'
  ): string => {
    const obj = form[field] as Record<string, string> | null
    return obj?.[editorLang] || ''
  }

  // --- AI: Fetch URL content ---

  const handleFetchUrl = async () => {
    if (!aiSourceUrl) {
      setAiError(t('admin.errorEnterUrl'))
      return
    }
    setAiError('')
    setAiFetching(true)
    try {
      // Check if an article with this source URL already exists
      const { data: existingArticles } = await supabase
        .from('articles')
        .select('id, slug, title, status')
        .eq('source_url', aiSourceUrl.trim())
        .limit(1)

      if (existingArticles && existingArticles.length > 0) {
        const existing = existingArticles[0]
        const existingTitle = (existing.title as any)?.da || (existing.title as any)?.en || existing.slug
        setAiError(`Denne kilde er allerede brugt i artiklen "${existingTitle}" (${existing.status}). Du kan redigere den eksisterende artikel i stedet.`)
        setAiFetching(false)
        return
      }

      const result = await fetchUrlContent(aiSourceUrl)
      setAiSourceText(result.text)
      if (result.textLength > 60000) {
        setAiError(`Teksten er ${result.textLength.toLocaleString()} tegn — de første 60.000 blev hentet.`)
      }
    } catch (err: any) {
      console.error('[Fetch URL]', err)
      setAiError(err?.message || 'Kunne ikke hente URL-indhold')
    } finally {
      setAiFetching(false)
    }
  }

  // --- AI Generation ---

  const handleAiGenerate = async () => {
    if (!aiSourceText || aiSourceText.trim().length < 50) {
      setAiError(t('admin.errorSourceTextRequired'))
      return
    }

    setAiError('')
    setAiGenerating(true)

    try {
      const result = await generateArticle(
        aiSourceUrl,
        aiSourceText,
        aiExtraInstructions || undefined
      )

      // Fill all form fields from AI response
      setForm(prev => ({
        ...prev,
        title: result.title,
        summary: result.summary,
        content: result.content,
        slug: result.slug,
        categories: result.categories,
        tags: result.tags,
        source_url: aiSourceUrl || prev.source_url || '',
        source_title: result.source_title,
        seo_title: result.seo_title,
        seo_description: result.seo_description,
      }))
      setTagsInput(result.tags.join(', '))
    } catch (err: any) {
      console.error('[AI Generate]', err)
      setAiError(err?.message || 'AI generation failed')
    } finally {
      setAiGenerating(false)
    }
  }

  // --- Save ---

  const handleSave = async () => {
    // Prevent re-entrant / duplicate saves
    if (savingRef.current) {
      console.warn('[AdminBlog] Save already in progress — skipping duplicate call')
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
        content: form.content,
        summary: form.summary,
        source_url: form.source_url || null,
        source_title: form.source_title || null,
        categories: form.categories,
        tags: parsedTags,
        status: form.status,
        featured: form.featured,
        featured_image: form.featured_image || null,
        published_at: form.status === 'published'
          ? form.published_at || new Date().toISOString()
          : form.published_at,
        original_published_at: form.original_published_at || null,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        video_url: form.video_url || null,
        video_type: form.video_type || 'none',
        created_by: user?.id || null,
      }

      console.log('[AdminBlog] Saving article:', payload.slug, payload.status)

      let result
      if (editingId) {
        result = await supabase
          .from('articles')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()
      } else {
        result = await supabase
          .from('articles')
          .insert(payload)
          .select()
          .single()
      }

      console.log('[AdminBlog] Save result:', result)

      if (result.error) {
        console.error('[AdminBlog] Save error:', result.error)
        // Provide user-friendly error for duplicate slug
        if (result.error.message?.includes('duplicate') || result.error.code === '23505') {
          setError(`En artikel med slug "${form.slug}" findes allerede. Ret slug'en og prøv igen.`)
        } else {
          setError(result.error.message)
        }
        setSaving(false)
        savingRef.current = false
        return
      }

      await fetchArticles()
      setView('list')
    } catch (err: any) {
      console.error('[AdminBlog] Unexpected error:', err)
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
            {editingId ? t('admin.editArticle') : t('admin.newArticle')}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-6">

          {/* ── AI Generation Panel ── */}
          {!editingId && (
            <div className="rounded-md border-2 border-dashed border-accent/40 bg-accent/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <h2 className="font-serif text-lg font-bold text-accent">{t('admin.aiGeneratorTitle')}</h2>
                </div>
                <Link
                  to="/admin/settings"
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                {t('admin.settingsLink')}
                </Link>
              </div>

              {/* Source URL + Fetch button */}
              <div>
                <label className="block text-sm font-medium mb-1">{t('admin.fieldSourceUrl')}</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={aiSourceUrl}
                    onChange={e => setAiSourceUrl(e.target.value)}
                    placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
                    className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    onClick={handleFetchUrl}
                    disabled={aiFetching || !aiSourceUrl}
                    className="inline-flex h-10 items-center gap-2 px-4 rounded-md border border-accent text-accent font-medium text-sm hover:bg-accent/10 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {aiFetching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('admin.fetching')}
                      </>
                    ) : (
                      t('admin.fetchText')
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('admin.fetchTextHint')}
                </p>
              </div>

              {/* Source text (paste abstract/content) — REQUIRED */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('admin.fieldSourceText')} <span className="text-destructive">*</span>
                  <span className="text-muted-foreground font-normal ml-1">{t('admin.sourceTextHint')}</span>
                </label>
                <textarea
                  value={aiSourceText}
                  onChange={e => setAiSourceText(e.target.value)}
                  rows={8}
                  placeholder={t('admin.sourceTextPlaceholder')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                />
              </div>

              {/* Extra instructions */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('admin.fieldExtraInstructions')} <span className="text-muted-foreground font-normal">{t('admin.optional')}</span>
                </label>
                <input
                  type="text"
                  value={aiExtraInstructions}
                  onChange={e => setAiExtraInstructions(e.target.value)}
                  placeholder={t('admin.placeholderExtraInstructions')}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              {/* AI Error */}
              {aiError && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                  {aiError}
                </div>
              )}

              {/* Generate button */}
              <button
                onClick={handleAiGenerate}
                disabled={aiGenerating || !hasApiKey || !aiSourceText || aiSourceText.trim().length < 50}
                className="inline-flex h-10 items-center gap-2 px-6 rounded-md bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {aiGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('admin.generatingArticle')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t('admin.generateWithAi')}
                  </>
                )}
              </button>

              {!hasApiKey && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.apiKeyRequired.before')} 
                  <Link to="/admin/settings" className="text-accent hover:underline">{t('admin.settingsLink')}</Link>
                  {t('admin.apiKeyRequired.after')}
                </p>
              )}
            </div>
          )}

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

          {/* Slug + Status row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Categories (multi-select checkboxes) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('admin.fieldCategory')} <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground font-normal ml-2">(vælg min. 1)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ARTICLE_CATEGORIES.map(cat => {
                const checked = form.categories.includes(cat)
                return (
                  <label
                    key={cat}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-colors select-none',
                      checked
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'bg-background text-muted-foreground border-border hover:border-accent/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setForm(prev => {
                          const cats = prev.categories.includes(cat)
                            ? prev.categories.filter(c => c !== cat)
                            : [...prev.categories, cat]
                          return { ...prev, categories: cats.length > 0 ? cats : prev.categories }
                        })
                      }}
                      className="sr-only"
                    />
                    {getCategoryLabel(cat, editorLang)}
                  </label>
                )
              })}
            </div>
          </div>

          {/* Featured toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={e => setForm(prev => ({ ...prev, featured: e.target.checked }))}
              className="h-4 w-4 rounded border-input text-accent focus:ring-accent"
            />
            <Star className={cn('h-4 w-4', form.featured ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />
            <span className="text-sm font-medium">{t('admin.featuredOnHomepage')}</span>
            <span className="text-xs text-muted-foreground">{t('admin.featuredHelp')}</span>
          </label>

          {/* Tags + Featured Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldTags')}</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="keto, fasting, science"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('admin.tagsHint')}</p>
            </div>
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

              {/* AI Image Generator */}
              {!form.featured_image && (
                <AiImageGenerator
                  contentType="article"
                  title={form.title[editorLang] || form.title.da || ''}
                  content={form.content[editorLang] || form.content.da || ''}
                  categories={form.categories}
                  aspectRatio="16:9"
                  onImageGenerated={(url) => setForm(prev => ({ ...prev, featured_image: url }))}
                  className="mt-3"
                />
              )}
            </div>
          </div>

          {/* Explainer Video */}
          <div className="rounded-md border border-border p-4">
            <VideoUploader
              videoUrl={form.video_url}
              articleSlug={form.slug}
              onChange={(videoUrl, videoType) =>
                setForm(prev => ({ ...prev, video_url: videoUrl, video_type: videoType }))
              }
            />
          </div>

          {/* Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldSourceUrl')}</label>
              <input
                type="text"
                value={form.source_url || ''}
                onChange={e => setForm(prev => ({ ...prev, source_url: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldSourceTitle')}</label>
              <input
                type="text"
                value={form.source_title || ''}
                onChange={e => setForm(prev => ({ ...prev, source_title: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Official publication date */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.fieldOfficialPublishDate')}</label>
            <p className="text-xs text-muted-foreground mb-2">{t('admin.publishDateHint')}</p>
            <input
              type="date"
              value={form.original_published_at || ''}
              onChange={e => setForm(prev => ({ ...prev, original_published_at: e.target.value || null }))}
              className="w-full md:w-56 h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
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
              <div className="flex items-center gap-2 ml-auto">
                {form.status === 'published' && (
                  <button
                    onClick={() => setSocialShareOpen(true)}
                    className="inline-flex h-10 items-center gap-2 px-4 rounded-md bg-accent/10 border border-accent/30 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
                  >
                    <Share2 className="h-4 w-4" />
                    Del på Social
                  </button>
                )}
                <a
                  href={`/blog/${form.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {t('admin.preview')}
                </a>
              </div>
            )}
          </div>

          {/* Social Share Modal */}
          <SocialShareModal
            isOpen={socialShareOpen}
            onClose={() => setSocialShareOpen(false)}
            data={{
              contentType: 'article',
              title: form.title[editorLang] || form.title.da || '',
              summary: form.summary?.[editorLang] || form.summary?.da || '',
              categories: form.categories,
              tags: form.tags,
              featuredImageUrl: form.featured_image || undefined,
              articleId: editingId || undefined,
              url: form.slug ? `${window.location.origin}/blog/${form.slug}` : undefined,
              lang: editorLang,
            }}
          />
        </div>
      </div>
    )
  }

  // ─── List View ────────────────────────────────────────────────
  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-primary">
          {t('admin.blogTitle')}
        </h1>
        <button
          onClick={openNew}
          className="inline-flex h-10 items-center gap-2 px-5 rounded-md bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t('admin.newArticle')}
        </button>
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>{t('admin.noArticles')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <div
              key={article.id}
              className="flex items-center justify-between p-4 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                {article.featured_image && (
                  <img src={article.featured_image} alt="" className="h-14 w-14 rounded-md object-cover shrink-0" />
                )}
                <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                    article.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : article.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                  )}>
                    {article.status}
                  </span>
                  {(article.categories || []).map(cat => (
                    <span key={cat} className="text-[10px] uppercase font-medium text-muted-foreground">
                      {cat}
                    </span>
                  ))}
                  {article.featured && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-500" />
                      {t('admin.featured')} 
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-sm truncate">
                  {article.title?.da || article.title?.en || t('admin.untitled')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  /{article.slug} · {new Date(article.updated_at).toLocaleDateString('da-DK')}
                </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {article.status === 'published' && (
                  <a
                    href={`/blog/${article.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={t('admin.preview')}
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => openEdit(article)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={t('admin.edit')}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteArticle(article.id)}
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
