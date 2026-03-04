import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, ExternalLink, ArrowRight, Search, BookOpen, Edit3 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ARTICLE_CATEGORIES, getCategoryLabel } from '@/lib/articleCategories'

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
  published_at: string | null
  created_at: string
}

const FILTER_OPTIONS = ['all', ...ARTICLE_CATEGORIES] as const

export default function Blog() {
  const { t, i18n } = useTranslation()
  const { isAdmin } = useAuth()
  const lang = i18n.language || 'da'
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('id, slug, title, summary, source_url, source_title, categories, tags, featured_image, published_at, created_at')
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

  const filtered = articles.filter(a => {
    const matchCat = filter === 'all' || (a.categories && a.categories.includes(filter))
    const q = search.toLowerCase()
    const matchSearch = !q || loc(a.title).toLowerCase().includes(q) || loc(a.summary).toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <>
      {/* Hero — dark charcoal header like Lovable */}
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

      {/* Filter bar */}
      <section className="border-b bg-muted/50">
        <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {FILTER_OPTIONS.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold transition-colors',
                  filter === cat
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {cat === 'all' ? t('blog.filter.all') : getCategoryLabel(cat, lang)}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('nav.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </section>

      {/* Articles list */}
      <section className="py-12 md:py-16">
        <div className="container">
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('blog.empty')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
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
                <Link to={`/blog/${article.slug}`} className="block">
                  <article className="group flex flex-col overflow-hidden rounded-md border bg-card shadow-sm transition-shadow hover:shadow-md md:flex-row">
                    {/* Image */}
                    <div className="relative aspect-video w-full overflow-hidden bg-charcoal md:aspect-auto md:w-80 md:shrink-0">
                      <div className="overlay-gradient absolute inset-0 z-10" />
                      {article.featured_image ? (
                        <img
                          src={article.featured_image}
                          alt={loc(article.title)}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BookOpen className="h-10 w-10 text-[hsl(var(--charcoal-foreground))]/30" />
                        </div>
                      )}
                      <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1">
                        {article.categories?.map(cat => (
                          <span key={cat} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground uppercase">
                            {getCategoryLabel(cat, lang)}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-5 md:p-6">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(article.published_at)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {readTime(article)}
                        </span>
                      </div>

                      <h3 className="mt-2 font-serif text-lg text-foreground group-hover:text-accent transition-colors md:text-xl">
                        {loc(article.title, 'Untitled')}
                      </h3>

                      <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">
                        {loc(article.summary)}
                      </p>

                      {/* Source ref */}
                      {article.source_title && (
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground">
                            <ExternalLink className="h-3 w-3" />
                            {article.source_title}
                          </span>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-accent group-hover:text-accent/70">
                        {t('blog.readMore')}
                        <ArrowRight className="h-4 w-4" />
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
