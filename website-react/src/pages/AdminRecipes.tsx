import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, Edit3, Trash2, Eye, ArrowLeft, Save, X, Globe,
  Loader2, Minus, ImagePlus, Star, Share2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { processImage, getProcessingOptions } from '@/lib/imageProcessing'
import ImagePreviewWithSafeZone from '@/components/ImagePreviewWithSafeZone'
import AiImageGenerator from '@/components/AiImageGenerator'
import SocialShareModal from '@/components/SocialShareModal'

/* âââ types âââ */
interface Recipe {
  id: string
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  ingredients: Ingredient[]
  instructions: Instruction[]
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  net_carbs: number | null
  prep_time: number | null
  cook_time: number | null
  total_time: number | null
  servings: number | null
  difficulty: string | null
  image_url: string | null
  categories: string[] | Record<string, string[]>
  tags: string[] | Record<string, string[]>
  published_countries: string[]
  status: string
  featured: boolean
  published_at: string | null
  seo_title: Record<string, string> | null
  seo_description: Record<string, string> | null
  created_at: string
  updated_at: string
}

interface Ingredient {
  full_text: string
  amount?: number
  unit?: string
  name: string
}

interface Instruction {
  step_number: number
  step_text: string
}

/* (resolveIngredients / resolveInstructions / wrapMultiLang removed â multi-lang editing is now native) */

type EditorRecipe = {
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  ingredients: Record<string, Ingredient[]>
  instructions: Record<string, Instruction[]>
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  prep_time: number | null
  cook_time: number | null
  servings: number | null
  difficulty: string
  image_url: string
  categories: Record<string, string[]>
  tags: Record<string, string[]>
  published_countries: string[]
  status: string
  featured: boolean
  published_at: string | null
  tips: Record<string, string>
  seo_title: Record<string, string>
  seo_description: Record<string, string>
}

const EMPTY_RECIPE: EditorRecipe = {
  slug: '',
  title: { da: '', en: '', se: '' },
  description: { da: '', en: '', se: '' },
  ingredients: { da: [{ full_text: '', name: '' }], en: [{ full_text: '', name: '' }], se: [{ full_text: '', name: '' }] },
  instructions: { da: [{ step_number: 1, step_text: '' }], en: [{ step_number: 1, step_text: '' }], se: [{ step_number: 1, step_text: '' }] },
  calories: null,
  protein: null,
  fat: null,
  carbs: null,
  fiber: null,
  prep_time: null,
  cook_time: null,
  servings: 1,
  difficulty: 'easy',
  image_url: '',
  categories: { da: [], en: [], se: [] },
  tags: { da: [], en: [], se: [] },
  published_countries: ['dk', 'en', 'se'],
  tips: { da: '', en: '', se: '' },
  status: 'draft',
  featured: false,
  published_at: null,
  seo_title: { da: '', en: '', se: '' },
  seo_description: { da: '', en: '', se: '' },
}

const LANGS = [
  { code: 'da', label: 'Dansk' },
  { code: 'en', label: 'English' },
  { code: 'se', label: 'Svenska' },
]

const DIFFICULTIES = ['easy', 'medium', 'hard']

export default function AdminRecipes() {
  const { t } = useTranslation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<EditorRecipe>(EMPTY_RECIPE)
  // (multi-lang data is now stored directly in form.ingredients/instructions/tips)
  const [editorLang, setEditorLang] = useState('da')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [categoriesInput, setCategoriesInput] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [socialShareOpen, setSocialShareOpen] = useState(false)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{ originalSize: number; compressedSize: number; format: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/login')
  }, [user, isAdmin, authLoading, navigate])

  useEffect(() => {
    if (isAdmin) fetchRecipes()
  }, [isAdmin])

  // Open editor if ?edit=slug is in URL
  useEffect(() => {
    const editSlug = searchParams.get('edit')
    if (editSlug && recipes.length > 0 && view === 'list') {
      const match = recipes.find(r => r.slug === editSlug)
      if (match) {
        openEdit(match)
        setSearchParams({}, { replace: true })
      }
    }
  }, [recipes, searchParams])

  const fetchRecipes = async () => {
    const { data, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!fetchError && data) setRecipes(data)
    setLoading(false)
  }

  /* âââ List actions âââ */

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY_RECIPE)
    setTagsInput('')
    setCategoriesInput('')
    setEditorLang('da')
    setError('')
    setView('editor')
  }

  /** Normalize ingredients data to multi-lang Record */
  const normalizeMultiLangArray = <T,>(data: any, fallback: T[]): Record<string, T[]> => {
    if (!data) return { da: fallback, en: fallback, se: fallback }
    if (Array.isArray(data)) return { da: data.length ? data : fallback, en: fallback, se: fallback }
    // Already multi-lang object
    return {
      da: (data.da && data.da.length) ? data.da : fallback,
      en: (data.en && data.en.length) ? data.en : [{ full_text: '', name: '' } as any],
      se: (data.se && data.se.length) ? data.se : [{ full_text: '', name: '' } as any],
    }
  }

  /** Normalize tips to multi-lang Record */
  const normalizeMultiLangString = (data: any): Record<string, string> => {
    if (!data) return { da: '', en: '', se: '' }
    if (typeof data === 'string') return { da: data, en: '', se: '' }
    return { da: data.da || '', en: data.en || '', se: data.se || '' }
  }

  const openEdit = (recipe: Recipe) => {
    setEditingId(recipe.id)
    setForm({
      slug: recipe.slug,
      title: recipe.title || { da: '', en: '', se: '' },
      description: recipe.description || { da: '', en: '', se: '' },
      ingredients: normalizeMultiLangArray<Ingredient>(
        recipe.ingredients,
        [{ full_text: '', name: '' }]
      ),
      instructions: normalizeMultiLangArray<Instruction>(
        recipe.instructions,
        [{ step_number: 1, step_text: '' }]
      ),
      calories: recipe.calories,
      protein: recipe.protein,
      fat: recipe.fat,
      carbs: recipe.carbs,
      fiber: recipe.fiber,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      servings: recipe.servings,
      difficulty: recipe.difficulty || 'easy',
      image_url: recipe.image_url || '',
      categories: normalizeMultiLangArray<string>(recipe.categories as any, []),
      tags: normalizeMultiLangArray<string>(recipe.tags as any, []),
      published_countries: recipe.published_countries || ['dk', 'en', 'se'],
      tips: normalizeMultiLangString((recipe as any).tips),
      status: recipe.status,
      featured: (recipe as any).featured || false,
      published_at: recipe.published_at,
      seo_title: recipe.seo_title || { da: '', en: '', se: '' },
      seo_description: recipe.seo_description || { da: '', en: '', se: '' },
    })
    const normCats = normalizeMultiLangArray<string>(recipe.categories as any, [])
    const normTags = normalizeMultiLangArray<string>(recipe.tags as any, [])
    setCategoriesInput((normCats['da'] || []).join(', '))
    setTagsInput((normTags['da'] || []).join(', '))
    setEditorLang('da')
    setError('')
    setView('editor')
  }

  const deleteRecipe = async (id: string) => {
    if (!confirm(t('admin.confirmDeleteRecipe'))) return
    await supabase.from('recipes').delete().eq('id', id)
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  /* âââ Editor helpers âââ */

  /* âââ Image upload âââ */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (uploadingRef.current) return

    if (!file.type.startsWith('image/')) { setError(t('admin.errorImageType')); return }
    if (file.size > 20 * 1024 * 1024) { setError('Billedet skal være under 20 MB'); return }

    uploadingRef.current = true
    setImageProcessing(true)
    setError('')
    setCompressionInfo(null)

    try {
      // 1. Resize + compress (4:3 for recipes)
      const options = getProcessingOptions('recipes')
      let processedBlob: Blob = file
      let processedFormat = file.name.split('.').pop()?.toLowerCase() || 'jpg'

      try {
        const processed = await processImage(file, options)
        processedBlob = processed.blob
        processedFormat = processed.format
        setCompressionInfo({ originalSize: processed.originalSize, compressedSize: processed.compressedSize, format: processed.format })
      } catch (procErr) {
        console.warn('[Upload] Processing failed, uploading original:', procErr)
      }

      // 2. Upload
      setImageProcessing(false)
      setImageUploading(true)

      const ext = processedFormat === 'webp' ? 'webp' : processedFormat
      const timestamp = Date.now()
      const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 50)
      const filePath = `recipes/${timestamp}-${safeName}.${ext}`

      const uploadPromise = supabase.storage.from('images').upload(filePath, processedBlob, { cacheControl: '3600', upsert: false })
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Upload timeout (30s)')), 30000))
      const { data, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise])
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)
      setForm(prev => ({ ...prev, image_url: urlData.publicUrl }))
    } catch (err: any) {
      setError(`${t('admin.errorUploadFailed')}: ${err.message}`)
    } finally {
      setImageUploading(false)
      setImageProcessing(false)
      uploadingRef.current = false
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeImage = () => { setForm(prev => ({ ...prev, image_url: '' })); setCompressionInfo(null) }

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'oe').replace(/[å]/g, 'aa')
      .replace(/[ä]/g, 'ae').replace(/[ö]/g, 'oe')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const updateLocalizedField = (
    field: 'title' | 'description' | 'seo_title' | 'seo_description',
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

  const getFieldValue = (field: 'title' | 'description' | 'seo_title' | 'seo_description'): string => {
    const obj = form[field] as Record<string, string> | null
    return obj?.[editorLang] || ''
  }

  /* âââ Current language helpers âââ */
  const currentIngredients = form.ingredients[editorLang] || [{ full_text: '', name: '' }]
  const currentInstructions = form.instructions[editorLang] || [{ step_number: 1, step_text: '' }]

  /* âââ Ingredient management (language-aware) âââ */
  const updateIngredient = (index: number, field: keyof Ingredient, value: string | number) => {
    setForm(prev => {
      const langData = [...(prev.ingredients[editorLang] || [])]
      langData[index] = { ...langData[index], [field]: value }
      // Auto-build full_text when amount/unit/name changes
      if (field === 'amount' || field === 'unit' || field === 'name') {
        const ing = langData[index]
        const parts = []
        if (ing.amount != null && ing.amount !== 0) parts.push(String(ing.amount))
        if (ing.unit) parts.push(ing.unit)
        if (ing.name) parts.push(ing.name)
        langData[index].full_text = parts.join(' ')
      }
      return { ...prev, ingredients: { ...prev.ingredients, [editorLang]: langData } }
    })
  }

  const addIngredient = () => {
    setForm(prev => ({
      ...prev,
      ingredients: {
        ...prev.ingredients,
        [editorLang]: [...(prev.ingredients[editorLang] || []), { full_text: '', name: '' }],
      },
    }))
  }

  const removeIngredient = (index: number) => {
    setForm(prev => ({
      ...prev,
      ingredients: {
        ...prev.ingredients,
        [editorLang]: (prev.ingredients[editorLang] || []).filter((_, i) => i !== index),
      },
    }))
  }

  /* âââ Instruction management (language-aware) âââ */
  const updateInstruction = (index: number, value: string) => {
    setForm(prev => {
      const langData = [...(prev.instructions[editorLang] || [])]
      langData[index] = { ...langData[index], step_text: value }
      return { ...prev, instructions: { ...prev.instructions, [editorLang]: langData } }
    })
  }

  const addInstruction = () => {
    setForm(prev => {
      const langData = prev.instructions[editorLang] || []
      return {
        ...prev,
        instructions: {
          ...prev.instructions,
          [editorLang]: [...langData, { step_number: langData.length + 1, step_text: '' }],
        },
      }
    })
  }

  const removeInstruction = (index: number) => {
    setForm(prev => ({
      ...prev,
      instructions: {
        ...prev.instructions,
        [editorLang]: (prev.instructions[editorLang] || [])
          .filter((_, i) => i !== index)
          .map((inst, i) => ({ ...inst, step_number: i + 1 })),
      },
    }))
  }

  /* âââ Save âââ */
  const handleSave = async () => {
    setError('')
    if (!form.slug) { setError(t('admin.errorSlugRequired')); return }
    if (!form.title.da && !form.title.en) { setError(t('admin.errorTitleRequired')); return }

    setSaving(true)
    try {
      // Save current lang's categories/tags into form before building payload
      const updatedCategories = { ...form.categories, [editorLang]: categoriesInput.split(',').map(s => s.trim()).filter(Boolean) }
      const updatedTags = { ...form.tags, [editorLang]: tagsInput.split(',').map(s => s.trim()).filter(Boolean) }

      // Clean ingredients per language â remove empty rows
      const cleanIngredients: Record<string, Ingredient[]> = {}
      for (const lang of Object.keys(form.ingredients)) {
        const cleaned = (form.ingredients[lang] || []).filter(ing => ing.full_text.trim() || ing.name.trim())
        if (cleaned.length > 0) cleanIngredients[lang] = cleaned
      }

      // Clean instructions per language â remove empty rows
      const cleanInstructions: Record<string, Instruction[]> = {}
      for (const lang of Object.keys(form.instructions)) {
        const cleaned = (form.instructions[lang] || [])
          .filter(inst => inst.step_text.trim())
          .map((inst, i) => ({ ...inst, step_number: i + 1 }))
        if (cleaned.length > 0) cleanInstructions[lang] = cleaned
      }

      // Clean tips â only include non-empty languages
      const cleanTips: Record<string, string> = {}
      for (const lang of Object.keys(form.tips)) {
        if (form.tips[lang]?.trim()) cleanTips[lang] = form.tips[lang].trim()
      }

      const payload = {
        slug: form.slug,
        title: form.title,
        description: form.description,
        ingredients: Object.keys(cleanIngredients).length > 0 ? cleanIngredients : { da: [] },
        instructions: Object.keys(cleanInstructions).length > 0 ? cleanInstructions : { da: [] },
        calories: form.calories,
        protein: form.protein,
        fat: form.fat,
        carbs: form.carbs,
        fiber: form.fiber,
        prep_time: form.prep_time,
        cook_time: form.cook_time,
        servings: form.servings,
        difficulty: form.difficulty,
        image_url: form.image_url || null,
        tips: Object.keys(cleanTips).length > 0 ? cleanTips : null,
        categories: updatedCategories,
        tags: updatedTags,
        published_countries: form.published_countries,
        status: form.status,
        featured: form.featured,
        published_at: form.status === 'published'
          ? form.published_at || new Date().toISOString()
          : form.published_at,
        seo_title: form.seo_title,
        seo_description: form.seo_description,
        created_by: user?.id || null,
      }

      let result
      if (editingId) {
        result = await supabase.from('recipes').update(payload).eq('id', editingId).select().single()
      } else {
        result = await supabase.from('recipes').insert(payload).select().single()
      }

      if (result.error) {
        setError(result.error.message)
        setSaving(false)
        return
      }

      await fetchRecipes()
      setView('list')
    } catch (err: any) {
      setError(err?.message || 'Unexpected error')
    } finally {
      setSaving(false)
    }
  }

  /* âââ Render âââ */

  if (authLoading || loading) {
    return <div className="container py-20 text-center text-muted-foreground">{t('common.loading')}</div>
  }
  if (!isAdmin) return null

  // âââ Editor View ââââââââââââââââââââââââââââââââââ
  if (view === 'editor') {
    return (
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setView('list')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t('admin.backToList')}
          </button>
          <h1 className="font-serif text-2xl font-bold text-primary">
            {editingId ? t('admin.editRecipe') : t('admin.newRecipe')}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-6">

          {/* Language Tabs */}
          <div className="flex gap-1 border-b border-border">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => {
                  // Save current lang's categories/tags before switching
                  const curCats = categoriesInput.split(',').map(s => s.trim()).filter(Boolean)
                  const curTags = tagsInput.split(',').map(s => s.trim()).filter(Boolean)
                  setForm(prev => ({
                    ...prev,
                    categories: { ...prev.categories, [editorLang]: curCats },
                    tags: { ...prev.tags, [editorLang]: curTags },
                  }))
                  // Load new lang's values
                  setCategoriesInput((form.categories[l.code] || []).join(', '))
                  setTagsInput((form.tags[l.code] || []).join(', '))
                  setEditorLang(l.code)
                }}
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
            <label className="block text-sm font-medium mb-1">{t('admin.fieldTitle')} ({editorLang.toUpperCase()})</label>
            <input
              type="text"
              value={getFieldValue('title')}
              onChange={e => updateLocalizedField('title', e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder={t('admin.placeholderRecipeName')}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.fieldDescription')} ({editorLang.toUpperCase()})</label>
            <textarea
              value={getFieldValue('description')}
              onChange={e => updateLocalizedField('description', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder={t('admin.placeholderRecipeDescription')}
            />
          </div>

          {/* Slug + Difficulty + Status + Servings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <label className="block text-sm font-medium mb-1">{t('admin.fieldDifficulty')}</label>
              <select
                value={form.difficulty}
                onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {DIFFICULTIES.map(d => (
                  <option key={d} value={d}>{d === 'easy' ? t('admin.difficultyEasy') : d === 'medium' ? t('admin.difficultyMedium') : t('admin.difficultyHard')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldStatus')}</label>
              <select
                value={form.status}
                onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="draft">{t('admin.statusDraft')}</option>
                <option value="published">{t('admin.statusPublished')}</option>
                <option value="archived">{t('admin.statusArchived')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldServings')}</label>
              <input
                type="number"
                min={1}
                value={form.servings ?? ''}
                onChange={e => setForm(prev => ({ ...prev, servings: e.target.value ? Number(e.target.value) : null }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Featured */}
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

          {/* Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.prepTime')}</label>
              <input
                type="number"
                min={0}
                value={form.prep_time ?? ''}
                onChange={e => setForm(prev => ({ ...prev, prep_time: e.target.value ? Number(e.target.value) : null }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.cookTime')}</label>
              <input
                type="number"
                min={0}
                value={form.cook_time ?? ''}
                onChange={e => setForm(prev => ({ ...prev, cook_time: e.target.value ? Number(e.target.value) : null }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('admin.fieldImage')}</label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            {form.image_url ? (
              <div className="space-y-2">
                <ImagePreviewWithSafeZone
                  imageSrc={form.image_url}
                  aspectRatio="4/3"
                  originalSize={compressionInfo?.originalSize}
                  compressedSize={compressionInfo?.compressedSize}
                  format={compressionInfo?.format}
                  onReplace={() => fileInputRef.current?.click()}
                  onRemove={removeImage}
                />
                <input
                  type="text"
                  value={form.image_url}
                  onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={t('admin.pasteImageUrl')}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={imageUploading || imageProcessing}
                  className="w-full h-32 rounded-md border-2 border-dashed border-input hover:border-primary/50 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground"
                >
                  {imageProcessing ? (
                    <><Loader2 className="h-6 w-6 animate-spin" /><span className="text-sm">Forbereder billede...</span></>
                  ) : imageUploading ? (
                    <><Loader2 className="h-6 w-6 animate-spin" /><span className="text-sm">{t('admin.uploading')}</span></>
                  ) : (
                    <><ImagePlus className="h-6 w-6" /><span className="text-sm">{t('admin.clickToUpload')}</span><span className="text-xs">Resizes automatisk â JPG, PNG, WebP</span></>
                  )}
                </button>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={e => setForm(prev => ({ ...prev, image_url: e.target.value }))}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder={t('admin.pasteImageUrl')}
                />

                {/* AI Image Generator */}
                <AiImageGenerator
                  contentType="recipe"
                  title={form.title[editorLang] || form.title.da || ''}
                  content={form.description?.[editorLang] || form.description?.da || ''}
                  categories={[...(form.categories[editorLang] || form.categories['da'] || []), ...(form.tags[editorLang] || form.tags['da'] || [])]}
                  aspectRatio="4:3"
                  onImageGenerated={(url) => setForm(prev => ({ ...prev, image_url: url }))}
                />
              </div>
            )}
          </div>

          {/* Categories + Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldCategories')} ({editorLang.toUpperCase()})</label>
              <input
                type="text"
                value={categoriesInput}
                onChange={e => setCategoriesInput(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="main, salad, snack"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('admin.commaSeparatedHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('admin.fieldTags')} ({editorLang.toUpperCase()})</label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="keto, lchf, laks"
              />
              <p className="text-xs text-muted-foreground mt-1">{t('admin.commaSeparatedHint')}</p>
            </div>
          </div>

          {/* âââ Ingredients âââ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">{t('admin.fieldIngredients')} ({editorLang.toUpperCase()})</label>
              <button onClick={addIngredient} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">
                <Plus className="h-3 w-3" /> {t('admin.addIngredient')}
              </button>
            </div>
            <div className="space-y-2">
              {currentIngredients.map((ing, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number"
                    value={ing.amount ?? ''}
                    onChange={e => updateIngredient(i, 'amount', e.target.value ? Number(e.target.value) : 0)}
                    className="w-20 h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={t('admin.placeholderAmount')}
                  />
                  <input
                    type="text"
                    value={ing.unit ?? ''}
                    onChange={e => updateIngredient(i, 'unit', e.target.value)}
                    className="w-16 h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={t('admin.placeholderUnit')}
                  />
                  <input
                    type="text"
                    value={ing.name}
                    onChange={e => updateIngredient(i, 'name', e.target.value)}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={t('admin.placeholderIngredientName')}
                  />
                  <input
                    type="text"
                    value={ing.full_text}
                    onChange={e => updateIngredient(i, 'full_text', e.target.value)}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder={t('admin.placeholderFullIngredient')}
                  />
                  {currentIngredients.length > 1 && (
                    <button onClick={() => removeIngredient(i)} className="p-1 text-muted-foreground hover:text-destructive">
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* âââ Instructions âââ */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">{t('admin.fieldInstructions')} ({editorLang.toUpperCase()})</label>
              <button onClick={addInstruction} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">
                <Plus className="h-3 w-3" /> {t('admin.addStep')}
              </button>
            </div>
            <div className="space-y-2">
              {currentInstructions.map((inst, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground mt-0.5">
                    {i + 1}
                  </span>
                  <textarea
                    value={inst.step_text}
                    onChange={e => updateInstruction(i, e.target.value)}
                    rows={2}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                    placeholder={`${t('admin.stepPlaceholder')} ${i + 1}`}
                  />
                  {currentInstructions.length > 1 && (
                    <button onClick={() => removeInstruction(i)} className="p-1 mt-1 text-muted-foreground hover:text-destructive">
                      <Minus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* âââ Nutrition âââ */}
          <div>
            <label className="text-sm font-medium block mb-3">{t('admin.fieldNutrition')}</label>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {[
                { key: 'calories', label: t('admin.nutritionKcal'), step: 1 },
                { key: 'protein', label: t('admin.nutritionProtein'), step: 0.1 },
                { key: 'fat', label: t('admin.nutritionFat'), step: 0.1 },
                { key: 'carbs', label: t('admin.nutritionCarbs'), step: 0.1 },
                { key: 'fiber', label: t('admin.nutritionFiber'), step: 0.1 },
              ].map(n => (
                <div key={n.key}>
                  <label className="block text-xs text-muted-foreground mb-1">{n.label}</label>
                  <input
                    type="number"
                    step={n.step}
                    min={0}
                    value={(form as any)[n.key] ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [n.key]: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
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

          {/* Tips */}
          <div>
            <label className="block text-xs font-medium mb-1">{t('admin.fieldTips')} ({editorLang.toUpperCase()})</label>
            <textarea
              value={form.tips[editorLang] || ''}
              onChange={e => setForm(prev => ({ ...prev, tips: { ...prev.tips, [editorLang]: e.target.value } }))}
              rows={3}
              placeholder={t('admin.tipsPlaceholder')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 px-6 rounded-md bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t('admin.saving')}</>
              ) : (
                <><Save className="h-4 w-4" /> {t('admin.save')}</>
              )}
            </button>
            <button
              onClick={() => setView('list')}
              className="inline-flex h-10 items-center gap-2 px-6 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" /> {t('admin.cancel')}
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
                  href={`/recipes?recipe=${form.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center gap-2 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Eye className="h-4 w-4" /> {t('admin.viewRecipe')}
                </a>
              </div>
            )}
          </div>

          {/* Social Share Modal */}
          <SocialShareModal
            isOpen={socialShareOpen}
            onClose={() => setSocialShareOpen(false)}
            data={{
              contentType: 'recipe',
              title: form.title[editorLang] || form.title.da || '',
              summary: form.description?.[editorLang] || form.description?.da || '',
              categories: form.categories[editorLang] || form.categories['da'] || [],
              tags: form.tags[editorLang] || form.tags['da'] || [],
              featuredImageUrl: form.image_url || undefined,
              articleId: editingId || undefined,
              url: form.slug ? `${window.location.origin}/recipes?recipe=${form.slug}` : undefined,
              lang: editorLang,
              nutritionInfo: [
                form.calories ? `${form.calories} kcal` : '',
                (form.carbs != null && form.fiber != null) ? `${form.carbs - (form.fiber || 0)}g netto carbs` : '',
                form.protein ? `${form.protein}g protein` : '',
                form.fat ? `${form.fat}g fedt` : '',
              ].filter(Boolean).join(', ') || undefined,
            }}
          />
        </div>
      </div>
    )
  }

  // âââ List View ââââââââââââââââââââââââââââââââââââââ
  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-3xl font-bold text-primary">{t('admin.recipesTitle')}</h1>
        <button
          onClick={openNew}
          className="inline-flex h-10 items-center gap-2 px-5 rounded-md bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> {t('admin.newRecipe')}
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>{t('admin.noRecipesYet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map(recipe => (
            <div
              key={recipe.id}
              className="flex items-center justify-between p-4 rounded-md border border-border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0 mr-4">
                {recipe.image_url && (
                  <img src={recipe.image_url} alt="" className="h-14 w-14 rounded-md object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                      recipe.status === 'published'
                        ? 'bg-green-100 text-green-700'
                        : recipe.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    )}>
                      {recipe.status}
                    </span>
                    {recipe.featured && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-500" />{t('admin.featured')}
                      </span>
                    )}
                    {(Array.isArray(recipe.categories)
                      ? recipe.categories
                      : (recipe.categories as any)?.['da'] || []
                    ).map((cat: string) => (
                      <span key={cat} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/10 text-accent">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-medium text-sm truncate">
                    {recipe.title?.da || recipe.title?.en || t('admin.untitled')}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    /{recipe.slug} â {recipe.total_time ? `${recipe.total_time} min` : ''} â {recipe.calories ? `${recipe.calories} kcal` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {recipe.status === 'published' && (
                  <a
                    href={`/recipes?recipe=${recipe.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={t('admin.viewRecipe')}
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                )}
                <button
                  onClick={() => openEdit(recipe)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title={t('admin.edit')}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteRecipe(recipe.id)}
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
