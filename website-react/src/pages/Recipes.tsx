import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Clock, Users, Flame, Heart, ChevronLeft,
  Utensils, ArrowRight, Leaf, Minus, Plus, Edit3, Printer, Lightbulb, Wheat
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { setSEO, setRecipeJsonLd, clearSEO } from '@/lib/seo'

/* ─── types ─── */
interface IngredientItem { full_text: string; amount?: number; unit?: string; name?: string }
interface InstructionItem { step_number: number; step_text: string }

// ingredients & instructions can be either a flat array (legacy)
// or a multi-lang object { da: [...], en: [...], se: [...] }
type MultiLangArray<T> = T[] | Record<string, T[]>

interface Recipe {
  id: string
  slug: string
  title: Record<string, string>
  description: Record<string, string>
  ingredients: MultiLangArray<IngredientItem>
  instructions: MultiLangArray<InstructionItem>
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  net_carbs: number | null
  prep_time: number | null
  total_time: number | null
  servings: number | null
  difficulty: string | null
  image_url: string | null
  categories: string[] | null
  tags: string[] | null
  tips: Record<string, string> | string | null
  status: string
}

/** Resolve a multi-lang JSONB field to a single-language array, with backward compat for flat arrays */
function resolveArray<T>(data: MultiLangArray<T> | null | undefined, lang: string): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data                        // flat (legacy)
  return (data as Record<string, T[]>)[lang] || (data as Record<string, T[]>)['da'] || []
}

/* ─── component ─── */
export default function Recipes() {
  const { t, i18n } = useTranslation()
  const { user, isAdmin } = useAuth()
  const lang = i18n.language || 'da'

  const [searchParams, setSearchParams] = useSearchParams()
  const activeSlug = searchParams.get('recipe')

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  /* ─── helpers ─── */
  const loc = (field: Record<string, string> | null | undefined, fallback = '') => {
    if (!field) return fallback
    return field[lang] || field['da'] || field['en'] || fallback
  }

  /** Translate a category or tag name via i18n maps (fallback to original if no translation) */
  const tCat = (cat: string) => {
    const key = `recipes.categoryMap.${cat}`
    const v = i18n.t(key)
    return v !== key ? v : cat
  }

  /* ─── data fetching ─── */
  const fetchRecipes = useCallback(async () => {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (!error && data) setRecipes(data)
    setLoading(false)
  }, [])

  const fetchFavorites = useCallback(async () => {
    if (!user) { setFavorites(new Set()); return }
    const { data } = await supabase
      .from('user_favorites')
      .select('recipe_id')
      .eq('user_id', user.id)
    if (data) setFavorites(new Set(data.map(f => f.recipe_id)))
  }, [user])

  useEffect(() => { fetchRecipes() }, [fetchRecipes])
  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  /* ─── favorites toggle ─── */
  const toggleFavorite = async (recipeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) return

    if (favorites.has(recipeId)) {
      setFavorites(prev => { const s = new Set(prev); s.delete(recipeId); return s })
      await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
    } else {
      setFavorites(prev => new Set(prev).add(recipeId))
      await supabase.from('user_favorites').insert({ user_id: user.id, recipe_id: recipeId })
    }
  }

  /* ─── filtering ─── */
  const allCategories = Array.from(
    new Set(recipes.flatMap(r => r.categories ?? []))
  ).sort()

  const filtered = recipes.filter(r => {
    const matchCat = categoryFilter === 'all' || (r.categories ?? []).includes(categoryFilter)
    const q = search.toLowerCase()
    const matchSearch = !q
      || loc(r.title).toLowerCase().includes(q)
      || loc(r.description).toLowerCase().includes(q)
      || (r.tags ?? []).some(tag => tag.toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  /* ─── detail view ─── */
  const activeRecipe = activeSlug ? recipes.find(r => r.slug === activeSlug) : null

  if (activeRecipe) {
    return <RecipeDetail recipe={activeRecipe} loc={loc} lang={lang} t={t} user={user} isAdmin={isAdmin} favorites={favorites} toggleFavorite={toggleFavorite} setSearchParams={setSearchParams} />
  }

  /* ─── list view ─── */
  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[200px] items-end overflow-hidden bg-charcoal md:min-h-[280px]">
        <div className="overlay-gradient absolute inset-0 z-10" />
        <div className="container relative z-20 pb-10 pt-16 md:pb-14">
          <p className="font-script mb-2 text-lg text-accent">{t('recipes.title')}</p>
          <h1 className="max-w-xl font-serif text-3xl leading-tight text-[hsl(var(--charcoal-foreground))] md:text-5xl">
            {t('recipes.title')}
          </h1>
          <p className="mt-3 max-w-md text-sm text-[hsl(var(--charcoal-foreground))]/80 md:text-base">
            {t('recipes.subtitle')}
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section className="border-b bg-muted/50">
        <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold transition-colors',
                categoryFilter === 'all'
                  ? 'bg-accent text-accent-foreground'
                  : 'border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {t('recipes.allCategories')}
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold transition-colors',
                  categoryFilter === cat
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {tCat(cat)}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('recipes.searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      {/* Recipe grid */}
      <section className="py-12 md:py-16">
        <div className="container">
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Utensils className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('recipes.empty')}</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(recipe => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  loc={loc}
                  t={t}
                  user={user}
                  isAdmin={isAdmin}
                  isFav={favorites.has(recipe.id)}
                  toggleFavorite={toggleFavorite}
                  setSearchParams={setSearchParams}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

/* ════════════════════════════════════════════
   Recipe Card
   ════════════════════════════════════════════ */
function RecipeCard({
  recipe, loc, t, user, isAdmin, isFav, toggleFavorite, setSearchParams,
}: {
  recipe: Recipe
  loc: (f: Record<string, string> | null | undefined, fb?: string) => string
  t: (k: string) => string
  user: any
  isAdmin: boolean
  isFav: boolean
  toggleFavorite: (id: string, e: React.MouseEvent) => void
  setSearchParams: ReturnType<typeof useSearchParams>[1]
}) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-md border bg-card shadow-sm transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => setSearchParams({ recipe: recipe.slug })}
    >
      {/* Admin edit button */}
      {isAdmin && (
        <Link
          to={`/admin/recipes?edit=${recipe.slug}`}
          className="absolute left-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-bold text-accent-foreground hover:bg-accent transition-colors shadow-sm"
          onClick={e => e.stopPropagation()}
        >
          <Edit3 className="h-3 w-3" />
          {t('admin.edit')}
        </Link>
      )}

      {/* Favorite button */}
      <button
        onClick={(e) => {
          if (!user) return
          toggleFavorite(recipe.id, e)
        }}
        className={cn(
          'absolute right-3 top-3 z-20 rounded-full p-2 transition-colors shadow-sm',
          isFav
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-white/80 text-muted-foreground hover:bg-white hover:text-red-500'
        )}
        title={user ? (isFav ? t('recipes.removeFavorite') : t('recipes.addFavorite')) : t('recipes.loginToFavorite')}
      >
        <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
      </button>

      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-charcoal">
        <div className="overlay-gradient absolute inset-0 z-10" />
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={loc(recipe.title)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Utensils className="h-10 w-10 text-[hsl(var(--charcoal-foreground))]/30" />
          </div>
        )}
        {/* Title + category overlay on image */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-3">
          <h3 className="font-serif text-base leading-snug text-white line-clamp-2 drop-shadow-md">
            {loc(recipe.title, 'Untitled')}
          </h3>
          {(recipe.categories ?? []).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {(recipe.categories ?? []).map(cat => {
                const translated = i18n.t(`recipes.categoryMap.${cat}`)
                return (
                  <span key={cat} className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
                    {translated !== `recipes.categoryMap.${cat}` ? translated : cat}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {loc(recipe.description)}
        </p>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {recipe.total_time != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {recipe.total_time} {t('common.minutes')}
            </span>
          )}
          {recipe.servings != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {recipe.servings} {t('common.servings')}
            </span>
          )}
          {recipe.calories != null && (
            <span className="flex items-center gap-1">
              <Flame className="h-3.5 w-3.5" />
              {recipe.calories} {t('common.calories')}
            </span>
          )}
          {recipe.carbs != null && (
            <span className="flex items-center gap-1">
              <Wheat className="h-3.5 w-3.5" />
              {recipe.carbs}g
            </span>
          )}
        </div>


        <div className="mt-auto pt-3 flex items-center gap-2 text-sm font-medium text-accent group-hover:text-accent/70">
          {t('recipes.viewRecipe')}
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   Recipe Detail View
   ════════════════════════════════════════════ */
function RecipeDetail({
  recipe, loc, lang, t, user, isAdmin, favorites, toggleFavorite, setSearchParams,
}: {
  recipe: Recipe
  loc: (f: Record<string, string> | null | undefined, fb?: string) => string
  lang: string
  t: (k: string) => string
  user: any
  isAdmin: boolean
  favorites: Set<string>
  toggleFavorite: (id: string, e: React.MouseEvent) => void
  setSearchParams: ReturnType<typeof useSearchParams>[1]
}) {
  const isFav = favorites.has(recipe.id)
  const baseServings = recipe.servings ?? 1
  const [portionCount, setPortionCount] = useState(baseServings)
  const scale = portionCount / baseServings

  // SEO: set meta tags and JSON-LD for the recipe detail view
  useEffect(() => {
    const title = loc(recipe.title)
    const desc = loc(recipe.description)
    setSEO({
      title,
      description: desc,
      path: `/recipes?recipe=${recipe.slug}`,
      image: recipe.image_url || undefined,
    })
    setRecipeJsonLd({
      name: title,
      description: desc,
      image: recipe.image_url || undefined,
      prepTime: recipe.prep_time || undefined,
      totalTime: recipe.total_time || undefined,
      servings: recipe.servings || undefined,
      calories: recipe.calories || undefined,
      protein: recipe.protein || undefined,
      fat: recipe.fat || undefined,
      carbs: recipe.carbs || undefined,
      fiber: recipe.fiber || undefined,
      ingredients: resolveArray(recipe.ingredients, lang).map(i => i.full_text),
      instructions: resolveArray(recipe.instructions, lang)
        .sort((a, b) => a.step_number - b.step_number)
        .map(s => s.step_text),
      categories: recipe.categories ?? undefined,
    })
    return () => { clearSEO() }
  }, [recipe])

  /* Print recipe — opens a clean print window */
  const handlePrint = () => {
    const title = loc(recipe.title)
    const desc = loc(recipe.description)
    const ings = resolveArray(recipe.ingredients, lang).map(ing => `<li>${scaledIngredient(ing)}</li>`).join('\n')
    const steps = resolveArray(recipe.instructions, lang)
      .sort((a, b) => a.step_number - b.step_number)
      .map(s => `<li>${s.step_text}</li>`).join('\n')

    const nutritionRows = [
      recipe.calories != null && `<tr><td>Kalorier</td><td>${Math.round(recipe.calories * scale)} kcal</td></tr>`,
      recipe.protein != null && `<tr><td>Protein</td><td>${Math.round(recipe.protein * scale * 10) / 10} g</td></tr>`,
      recipe.fat != null && `<tr><td>Fedt</td><td>${Math.round(recipe.fat * scale * 10) / 10} g</td></tr>`,
      recipe.carbs != null && `<tr><td>Kulhydrater</td><td>${Math.round(recipe.carbs * scale * 10) / 10} g</td></tr>`,
      recipe.fiber != null && `<tr><td>Fiber</td><td>${Math.round(recipe.fiber * scale * 10) / 10} g</td></tr>`,
    ].filter(Boolean).join('\n')

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Georgia, serif; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 24pt; margin-bottom: 4px; }
  h2 { font-size: 14pt; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .meta { color: #666; font-size: 10pt; margin-bottom: 12px; }
  .desc { color: #444; font-size: 11pt; margin-bottom: 16px; line-height: 1.5; }
  img { width: 100%; max-height: 250px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
  ul { padding-left: 20px; }
  ol { padding-left: 20px; }
  li { margin-bottom: 6px; font-size: 11pt; line-height: 1.4; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  table td { padding: 4px 8px; border-bottom: 1px solid #eee; }
  table td:last-child { text-align: right; }
  .footer { margin-top: 24px; font-size: 8pt; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
  @media print { body { padding: 0; } }
</style></head><body>
${recipe.image_url ? `<img src="${recipe.image_url}" alt="${title}">` : ''}
<h1>${title}</h1>
<div class="meta">
  ${recipe.total_time ? `Tid: ${recipe.total_time} min` : ''}
  ${recipe.total_time && portionCount ? ' · ' : ''}
  ${portionCount ? `Portioner: ${portionCount}` : ''}
  ${recipe.difficulty ? ` · Niveau: ${recipe.difficulty}` : ''}
</div>
<p class="desc">${desc}</p>

<h2>Ingredienser${scale !== 1 ? ` (×${scale % 1 === 0 ? scale : scale.toFixed(1)})` : ''}</h2>
<ul>${ings}</ul>

<h2>Fremgangsmåde</h2>
<ol>${steps}</ol>

<h2>Næringsindhold${scale !== 1 ? ` (${portionCount} portioner)` : ''}</h2>
<table>${nutritionRows}</table>

<div class="footer">Shifting Source — shiftingsource.com</div>
</body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      setTimeout(() => win.print(), 400)
    }
  }

  /* Scale an ingredient amount */
  const scaleAmount = (amount: number | undefined) => {
    if (amount == null) return ''
    const scaled = amount * scale
    // Format nicely: no decimals if whole, 1 decimal otherwise
    return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(1).replace(/\.0$/, '')
  }

  /* Build scaled ingredient text */
  const scaledIngredient = (ing: IngredientItem) => {
    if (ing.amount == null || scale === 1) return ing.full_text
    const scaledAmt = scaleAmount(ing.amount)
    const original = ing.full_text
    // Match digits (150, 0.5, 1,5) OR Unicode fractions (½ ⅓ ¼ ¾ etc.)
    const numOrFractionRe = /[\d]+([.,]\d+)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/
    if (numOrFractionRe.test(original)) {
      return original.replace(numOrFractionRe, scaledAmt)
    }
    // Fallback: prepend scaled amount
    return `${scaledAmt} ${original}`
  }

  return (
    <article className="pb-16">
      {/* Hero image */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden bg-charcoal">
        <div className="overlay-gradient absolute inset-0 z-10" />
        {recipe.image_url && (
          <img
            src={recipe.image_url}
            alt={loc(recipe.title)}
            className="h-full w-full object-cover"
          />
        )}
        <div className="container absolute inset-0 z-20 mx-auto left-0 right-0 flex h-full flex-col justify-end pb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSearchParams({})}
              className="inline-flex w-fit items-center gap-1.5 rounded-md bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('recipes.backToRecipes')}
            </button>
            {isAdmin && (
              <Link
                to={`/admin/recipes?edit=${recipe.slug}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent transition-colors shadow-sm"
              >
                <Edit3 className="h-3 w-3" />
                {t('admin.edit')}
              </Link>
            )}
          </div>
          <h1 className="max-w-2xl font-serif text-3xl leading-tight text-white md:text-4xl">
            {loc(recipe.title)}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {(recipe.categories ?? []).map(cat => {
              const cv = i18n.t(`recipes.categoryMap.${cat}`)
              return (
                <span key={cat} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">
                  {cv !== `recipes.categoryMap.${cat}` ? cv : cat}
                </span>
              )
            })}
            {(recipe.tags ?? []).map(tag => {
              const tv = t(`recipes.tagMap.${tag}`)
              return (
                <span key={tag} className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white">
                  {tv !== `recipes.tagMap.${tag}` ? tv : tag}
                </span>
              )
            })}
          </div>
        </div>
      </section>

      <div className="container mt-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {loc(recipe.description)}
            </p>

            {/* Meta bar */}
            <div className="flex flex-wrap gap-4 rounded-md border bg-muted/30 p-4">
              {recipe.total_time != null && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('recipes.time')}</p>
                    <p className="text-sm font-bold">{recipe.total_time} {t('common.minutes')}</p>
                  </div>
                </div>
              )}

              {/* Portion selector */}
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('common.servings')}</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPortionCount(Math.max(1, portionCount - 1))}
                      className="h-6 w-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{portionCount}</span>
                    <button
                      onClick={() => setPortionCount(portionCount + 1)}
                      className="h-6 w-6 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {recipe.difficulty && (
                <div className="flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('recipes.difficulty')}</p>
                    <p className="text-sm font-bold">{t(`common.${recipe.difficulty}`)}</p>
                  </div>
                </div>
              )}
              {recipe.calories != null && (
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('common.calories')}</p>
                    <p className="text-sm font-bold">{Math.round(recipe.calories * scale)}</p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-bold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title="Print / PDF"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={(e) => user && toggleFavorite(recipe.id, e)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition-colors',
                    isFav
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
                  {user ? (isFav ? t('recipes.removeFavorite') : t('recipes.addFavorite')) : t('recipes.loginToFavorite')}
                </button>
              </div>
            </div>

            {/* Ingredients */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-2xl text-foreground">{t('recipes.ingredients')}</h2>
                {scale !== 1 && (
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-full">
                    ×{scale % 1 === 0 ? scale : scale.toFixed(1)}
                  </span>
                )}
              </div>
              <ul className="space-y-2">
                {resolveArray(recipe.ingredients, lang).map((ing, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-md border-b border-border/50 pb-2 last:border-0">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                    <span className="text-sm text-foreground">{scaledIngredient(ing)}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Instructions */}
            <section>
              <h2 className="font-serif text-2xl text-foreground mb-4">{t('recipes.instructions')}</h2>
              <ol className="space-y-4">
                {resolveArray(recipe.instructions, lang)
                  .sort((a, b) => a.step_number - b.step_number)
                  .map(step => (
                    <li key={step.step_number} className="flex gap-4">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                        {step.step_number}
                      </span>
                      <p className="pt-1 text-sm text-foreground leading-relaxed">
                        {step.step_text}
                      </p>
                    </li>
                  ))}
              </ol>
            </section>

            {/* Tips — only shown when present */}
            {recipe.tips && (typeof recipe.tips === 'string' ? recipe.tips.trim() : loc(recipe.tips as Record<string, string>)) && (
              <section className="rounded-md border border-accent/30 bg-accent/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="h-5 w-5 text-accent" />
                  <h2 className="font-serif text-xl text-foreground">{t('recipes.tips')}</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {typeof recipe.tips === 'string' ? recipe.tips : loc(recipe.tips as Record<string, string>)}
                </p>
              </section>
            )}
          </div>

          {/* Sidebar — Nutrition */}
          <aside className="space-y-6">
            <div className="rounded-md border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-lg text-foreground">{t('recipes.nutrition')}</h3>
                {scale !== 1 && (
                  <span className="text-xs text-muted-foreground">
                    {portionCount} {t('common.servings')}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <NutrientRow label={t('common.calories')} value={recipe.calories != null ? Math.round(recipe.calories * scale) : null} unit="kcal" color="bg-orange-500" />
                <NutrientRow label={t('recipes.protein')} value={recipe.protein != null ? Math.round(recipe.protein * scale * 10) / 10 : null} unit="g" color="bg-blue-500" />
                <NutrientRow label={t('recipes.fat')} value={recipe.fat != null ? Math.round(recipe.fat * scale * 10) / 10 : null} unit="g" color="bg-yellow-500" />
                <NutrientRow label={t('recipes.carbs')} value={recipe.carbs != null ? Math.round(recipe.carbs * scale * 10) / 10 : null} unit="g" color="bg-red-400" />
                <NutrientRow label={t('recipes.fiber')} value={recipe.fiber != null ? Math.round(recipe.fiber * scale * 10) / 10 : null} unit="g" color="bg-green-500" />
              </div>
            </div>

            {/* Macro chart visual — always per serving (doesn't scale) */}
            {recipe.protein != null && recipe.fat != null && recipe.carbs != null && (
              <div className="rounded-md border bg-card p-5 shadow-sm">
                <h3 className="font-serif text-lg text-foreground mb-4">{t('recipes.macroDistribution')}</h3>
                <MacroChart protein={recipe.protein} fat={recipe.fat} carbs={recipe.carbs} t={t} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </article>
  )
}

/* ─── Nutrient Row ─── */
function NutrientRow({ label, value, unit, color, highlight }: {
  label: string; value: number | null; unit: string; color: string; highlight?: boolean
}) {
  if (value == null) return null
  return (
    <div className={cn('flex items-center justify-between rounded-md px-3 py-2', highlight && 'bg-muted/50 font-bold')}>
      <div className="flex items-center gap-2">
        <span className={cn('h-3 w-3 rounded-full', color)} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-sm font-bold text-foreground">{value} {unit}</span>
    </div>
  )
}

/* ─── Simple Macro Chart ─── */
function MacroChart({ protein, fat, carbs, t }: { protein: number; fat: number; carbs: number; t: (k: string) => string }) {
  const proteinCal = protein * 4
  const fatCal = fat * 9
  const carbsCal = carbs * 4
  const total = proteinCal + fatCal + carbsCal
  if (total === 0) return null

  const pPct = Math.round((proteinCal / total) * 100)
  const fPct = Math.round((fatCal / total) * 100)
  const cPct = 100 - pPct - fPct

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <div className="bg-blue-500 transition-all" style={{ width: `${pPct}%` }} />
        <div className="bg-yellow-500 transition-all" style={{ width: `${fPct}%` }} />
        <div className="bg-green-500 transition-all" style={{ width: `${cPct}%` }} />
      </div>
      {/* Legend */}
      <div className="flex justify-between text-xs">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          {t('recipes.protein')} {pPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          {t('recipes.fat')} {fPct}%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          {t('recipes.carbs')} {cPct}%
        </span>
      </div>
    </div>
  )
}
