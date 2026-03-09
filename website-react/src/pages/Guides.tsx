import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, Search, BookOpen, Edit3 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { handleImageError } from '@/lib/imageFallback'

interface Guide {
  id: string
  slug: string
  title: Record<string, string>
  summary: Record<string, string> | null
  category: 'keto' | 'fasting' | 'lifestyle'
  tags: string[]
  featured_image: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  reading_time: number | null
  published_at: string | null
  created_at: string
}

const CATEGORIES = ['all', 'keto', 'fasting', 'lifestyle'] as const

export default function Guides() {
  const { t, i18n } = useTranslation()
  const { isAdmin } = useAuth()
  const lang = i18n.language || 'da'
  const [guides, setGuides] = useState<Guide[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchGuides()
  }, [])

  const fetchGuides = async () => {
    const { data, error } = await supabase
      .from('guides')
      .select('id, slug, title, summary, category, tags, featured_image, difficulty, reading_time, published_at, created_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (!error && data) setGuides(data)
    setLoading(false)
  }

  const loc = (field: Record<string, string> | null, fallback = '') => {
    if (!field) return fallback
    return field[lang] || field['da'] || field['en'] || fallback
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-700'
      case 'intermediate':
        return 'bg-amber-100 text-amber-700'
      case 'advanced':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const filtered = guides.filter(g => {
    const matchCat = filter === 'all' || g.category === filter
    const q = search.toLowerCase()
    const matchSearch = !q || loc(g.title).toLowerCase().includes(q) || loc(g.summary).toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <>
      {/* Hero — dark charcoal header like Lovable */}
      <section className="relative flex min-h-[200px] items-end overflow-hidden bg-charcoal md:min-h-[280px]">
        <div className="overlay-gradient absolute inset-0 z-10" />
        <div className="container relative z-20 pb-10 pt-16 md:pb-14">
          <p className="font-script mb-2 text-lg text-accent">{t('guides.subtitle')}</p>
          <h1 className="max-w-xl font-serif text-3xl leading-tight text-[hsl(var(--charcoal-foreground))] md:text-5xl">
            {t('guides.title')}
          </h1>
          <p className="mt-3 max-w-md text-sm text-[hsl(var(--charcoal-foreground))]/80 md:text-base">
            {t('guides.description')}
          </p>
        </div>
      </section>

      {/* Filter bar */}
      <section className="border-b bg-muted/50">
        <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map(cat => (
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
                {t(`guides.filter.${cat}`)}
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

      {/* Guides grid */}
      <section className="py-12 md:py-16">
        <div className="container">
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">{t('common.loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{t('guides.empty')}</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {filtered.map(guide => (
                <div key={guide.id} className="relative">
                  {isAdmin && (
                    <Link
                      to={`/admin/guides?edit=${guide.slug}`}
                      className="absolute right-3 top-3 z-30 inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1 text-xs font-bold text-accent-foreground hover:bg-accent transition-colors shadow-sm"
                      onClick={e => e.stopPropagation()}
                    >
                      <Edit3 className="h-3 w-3" />
                      {t('admin.edit')}
                    </Link>
                  )}
                  <Link to={`/guides/${guide.slug}`} className="block h-full">
                    <div className="group flex flex-col h-full overflow-hidden rounded-md border bg-card shadow-sm transition-shadow hover:shadow-md">
                      {/* Image */}
                      <div className="relative aspect-video w-full overflow-hidden bg-charcoal">
                        <div className="overlay-gradient absolute inset-0 z-10" />
                        {guide.featured_image ? (
                          <img
                            src={guide.featured_image}
                            alt={loc(guide.title)}
                            className="h-full w-full object-cover"
                            onError={handleImageError}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <BookOpen className="h-10 w-10 text-[hsl(var(--charcoal-foreground))]/30" />
                          </div>
                        )}
                        {/* Badges on image */}
                        <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
                          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground uppercase">
                            {guide.category}
                          </span>
                          <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-bold uppercase', getDifficultyColor(guide.difficulty))}>
                            {guide.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-4">
                        <h3 className="font-serif text-lg text-foreground group-hover:text-accent transition-colors line-clamp-2">
                          {loc(guide.title, 'Untitled')}
                        </h3>

                        <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-2">
                          {loc(guide.summary)}
                        </p>

                        {/* Reading time */}
                        {guide.reading_time && (
                          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{guide.reading_time} min</span>
                          </div>
                        )}
                      </div>
                    </div>
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
