import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, ExternalLink, ArrowRight, Search, BookOpen, Edit3, X, ChevronDown, Video } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { getCategoryLabel, type ArticleCategory } from '@/lib/articleCategories'
import { handleImageError } from '@/lib/imageFallback'

interface Article {
  id: string
  slug: string
  title: Record<string, string>
  summary: Record<string, string> | null
  source_url: string | null
  source_title: string | null
  categories: string[]
  tags: string[]
  featured_image: string | null
  video_url: Record<string, string> | null
  published_at: string | null
  created_at: string
}

/** Category groups for organized filter UI */
const CATEGORY_GROUPS: { labelKey: string; fallback: string; cats: readonly ArticleCategory[] }[] = [
  {
    labelKey: 'blog.catGroup.lifestyle',
    fallback: 'Livsstil',
    cats: ['keto', 'fasting', 'weight_loss', 'nutrition_science'],
  },
  {
    labelKey: 'blog.catGroup.metabolic',
    fallback: 'Metabolisk',
    cats: ['metabolic_health', 'insulin_resistance', 'autophagy', 'mitochondria', 'ampk', 'mtor', 'sirt1', 'ketones'],
  },
  {
    labelKey: 'blog.catGroup.body',
    fallback: 'Krop & organer',
    cats: ['cardiovascular', 'blood_pressure', 'cholesterol', 'thyroid', 'gut_biome', 'liver_health', 'hormones'],
  },
  {
    labelKey: 'blog.catGroup.conditions',
    fallback: 'Sygdomme',
    cats: ['chronic_disease', 'cancer', 'diabetes', 'inflammation'],
  },
  {
    labelKey: 'blog.catGroup.performance',
    fallback: 'Krop & præstation',
    cats: ['muscle', 'exercise_movement', 'sleep_recovery', 'circadian_rhythms'],
  },
  {
    labelKey: 'blog.catGroup.supplements',
    fallback: 'Tilskud',
    cats: ['supplement', 'protein', 'creatine', 'bcaa', 'electrolytes', 'sugar'],
  },
  {
    labelKey: 'blog.catGroup.wellbeing',
    fallback: 'Velvære',
    cats: ['mental_health', 'longevity', 'womens_health', 'mens_health'],
  },
]

export default function Blog() {
  const { t, i18n } = useTranslation()
  const { isAdmin } = useAuth()
  const lang = i18n.language || 'da'
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, summary, source_url, source_title, categories, tags, featured_image, video_url, published_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (!error && data) setArticles(data)
    setLoading(false)
  }

  const loc = (field: Record<string, string> | null, fallback = '') => {
    if (!field) return fallback
    return field[lang] || field['da'] || field['en'] || fallback
  }

  const formatDate = (d: string | null) => {
    if (!d) return ''
    return new Date(d).toLocaleDateString(
      lang === 'da' ? 'da-DK' : lang === 'se' ? 'sv-SE' : 'en-US',
      { day: 'numeric', month: 'short', year: 'numeric' }
    )
  }

  const readTime = (article: Article) => {
    const summary = loc(article.summary)
    const words = summary.split(/\s+/).length
    return `${Math.max(3, Math.ceil(words / 40))} min`
  }

  // Count articles per category (only published)
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of articles) {
      for (const c of a.categories || []) {
        counts[c] = (counts[c] || 0) + 1
      }
    }
    return counts
  }, [articles])

  const filtered = articles.filter(a => {
    const matchCat = filter === 'all' || (a.categories && a.categories.includes(filter))
    const q = search.toLowerCase()
    const matchSearch = !q
      || loc(a.title).toLowerCase().includes(q)
      || loc(a.summary).toLowerCase().includes(q)
      || (a.tags || []).some(tag => tag.toLowerCase().includes(q))
      || (a.categories || []).some(cat => getCategoryLabel(cat, lang).toLowerCase().includes(q))
    return matchCat && matchSearch
  })

  const hasActiveFilter = filter !== 'all'

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[200px] items-end overflow-hidden bg-charcoal md:min-h-[280px]">
        <div className="overlay-gradient absolute inset-0 z-10" />
        <div className="container relative z-20 pb-10 pt-16 md:pb-14">
          <p className="font-script mb-2 text-lg text-accent">{t('blog.title')}</p>
          <h1 className="max-w-xl font-serif text-3xl leading-tight text-[hsl(var(--charcoal-foreground))] md:text-5xl">
            {t('blog.title')}
          </h1>
          <p className="mt-3 max-w-md text-sm text-[hsl(var(--charcoal-foreground))]/80 md:text-base">
            {t('blog.subtitle')}
          </p>
        </div>
      </section>

      {/* Search + filter controls */}
      <section className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('blog.searchPlaceholder', 'Søg i artikler...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-9 rounded-full border border-input bg-muted/30 pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-colors',
                hasActiveFilter || showFilters
                  ? 'bg-accent text-accent-foreground'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {hasActiveFilter ? getCategoryLabel(filter, lang) : t('blog.filter.categories', 'Kategorier')}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showFilters && 'rotate-180')} />
            </button>

            {/* Clear filter */}
            {hasActiveFilter && (
              <button
                onClick={() => { setFilter('all'); setShowFilters(false) }}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
                {t('blog.filter.clear', 'Nulstil')}
              </button>
            )}

            {/* Article count */}
            <span className="hidden sm:inline text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? t('blog.articleSingular', 'artikel') : t('blog.articlePlural', 'artikler')}
            </span>
          </div>
        </div>

        {/* Expandable category groups */}
        {showFilters && (
          <div className="border-t bg-muted/30">
            <div className="container py-4 space-y-3">
              {/* All button */}
              <div className="flex flex-wrap gap-4">
                {CATEGORY_GROUPS.map(group => {
                  // Only show groups that have articles
                  const groupHasArticles = group.cats.some(c => (categoryCounts[c] || 0) > 0)
                  if (!groupHasArticles) return null

                  return (
                    <div key={group.labelKey} className="space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                        {t(group.labelKey, group.fallback)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {group.cats.map(cat => {
                          const count = categoryCounts[cat] || 0
                          if (count === 0) return null
                          return (
                            <button
                              key={cat}
                              onClick={() => { setFilter(cat); setShowFilters(false) }}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors',
                                filter === cat
                                  ? 'bg-accent text-accent-foreground font-bold'
                                  : 'bg-background border border-border text-foreground hover:border-accent hover:text-accent'
                              )}
                            >
                              {getCategoryLabel(cat, lang)}
                              <span className="text-[10px] opacity-60">{count}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Articles grid */}
      <section className="py-10 md:py-14">
        <div className="container">
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('blog.empty')}</p>
              {(hasActiveFilter || search) && (
                <button
                  onClick={() => { setFilter('all'); setSearch('') }}
                  className="text-sm text-accent hover:text-accent/80"
                >
                  {t('blog.filter.clearAll', 'Vis alle artikler')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map(article => (
                <div key={article.id} className="relative">
                  {isAdmin && (
                    <Link
                      to={`/admin/blog?edit=${article.slug}`}
                      className="absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-bold text-accent-foreground hover:bg-accent transition-colors shadow-sm"
                      onClick={e => e.stopPropagation()}
                    >
                      <Edit3 className="h-3 w-3" />
                      {t('admin.edit')}
                    </Link>
                  )}
                  <Link to={`/blog/${article.slug}`} className="block h-full">
                    <article className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                      {/* Image */}
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-charcoal">
                        {article.featured_image ? (
                          <img
                            src={article.featured_image}
                            alt={loc(article.title)}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-10 w-10 text-[hsl(var(--charcoal-foreground))]/20" />
                          </div>
                        )}

                        {/* Overlay badges */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                          <div className="flex flex-wrap gap-1">
                            {article.categories?.slice(0, 2).map(cat => (
                              <span key={cat} className="rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-bold text-accent-foreground uppercase">
                                {getCategoryLabel(cat, lang)}
                              </span>
                            ))}
                            {(article.categories?.length || 0) > 2 && (
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                                +{article.categories.length - 2}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Video indicator */}
                        {article.video_url && article.video_url[lang] && (
                          <div className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
                            <Video className="h-3 w-3" />
                            Video
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{formatDate(article.published_at)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {readTime(article)}
                          </span>
                        </div>

                        <h3 className="mt-2 font-serif text-base leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2">
                          {loc(article.title, 'Untitled')}
                        </h3>

                        <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-2">
                          {loc(article.summary)}
                        </p>

                        {article.source_title && (
                          <div className="mt-3">
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <ExternalLink className="h-3 w-3" />
                              {article.source_title}
                            </span>
                          </div>
                        )}

                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-accent group-hover:text-accent/70">
                          {t('blog.readMore')}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </article>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
