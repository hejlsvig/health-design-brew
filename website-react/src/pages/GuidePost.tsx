import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DOMPurify from 'dompurify'
import { ArrowLeft, Clock, Tag, BookOpen, Edit3 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Guide {
  id: string
  slug: string
  title: Record<string, string>
  content: Record<string, string>
  summary: Record<string, string> | null
  category: 'keto' | 'fasting' | 'lifestyle'
  tags: string[]
  featured_image: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  reading_time: number | null
  published_at: string | null
  seo_title: Record<string, string> | null
  seo_description: Record<string, string> | null
}

export default function GuidePost() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const { isAdmin } = useAuth()
  const lang = i18n.language || 'da'
  const [guide, setGuide] = useState<Guide | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (slug) fetchGuide(slug)
  }, [slug])

  useEffect(() => {
    if (guide) {
      const seoTitle = loc(guide.seo_title) || loc(guide.title)
      document.title = `${seoTitle} — Shifting Source`
    }
    return () => { document.title = 'Shifting Source' }
  }, [guide, lang])

  const fetchGuide = async (guideSlug: string) => {
    const { data, error } = await supabase
      .from('guides')
      .select('*')
      .eq('slug', guideSlug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      setNotFound(true)
    } else {
      setGuide(data)
    }
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

  /* ---------- Loading ---------- */
  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  /* ---------- Not found ---------- */
  if (notFound || !guide) {
    return (
      <div className="container py-20 text-center space-y-4">
        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="font-serif text-2xl text-primary">{t('guides.notFound')}</h1>
        <Link
          to="/guides"
          className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('guides.backToList')}
        </Link>
      </div>
    )
  }

  /* ---------- Render ---------- */
  return (
    <>
      {/* ── Hero — dark charcoal like Lovable ── */}
      <section className="relative overflow-hidden bg-charcoal">
        {/* Background image (if present) */}
        {guide.featured_image && (
          <img
            src={guide.featured_image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="overlay-gradient absolute inset-0 z-10" />

        <div className="container relative z-20 pb-10 pt-24 md:pb-14 md:pt-28">
          {/* Back link + Admin edit */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/guides"
              className="inline-flex items-center gap-2 text-sm text-[hsl(var(--charcoal-foreground))]/70 hover:text-[hsl(var(--charcoal-foreground))] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('guides.backToList')}
            </Link>
            {isAdmin && (
              <Link
                to={`/admin/guides?edit=${guide.slug}`}
                className="inline-flex items-center gap-2 rounded-md bg-accent/90 px-3 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {t('admin.edit')}
              </Link>
            )}
          </div>

          {/* Badges */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-bold uppercase text-accent-foreground">
              {guide.category}
            </span>
            <span className={cn('rounded-full px-3 py-0.5 text-xs font-bold uppercase', getDifficultyColor(guide.difficulty))}>
              {guide.difficulty}
            </span>
          </div>

          {/* Title */}
          <h1 className="max-w-2xl font-serif text-3xl leading-tight text-[hsl(var(--charcoal-foreground))] md:text-5xl">
            {loc(guide.title)}
          </h1>

          {/* Summary */}
          {guide.summary && (
            <p className="mt-4 max-w-xl text-base text-[hsl(var(--charcoal-foreground))]/80">
              {loc(guide.summary)}
            </p>
          )}

          {/* Meta */}
          {guide.reading_time && (
            <div className="mt-6 flex items-center gap-4 text-xs text-[hsl(var(--charcoal-foreground))]/60">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {guide.reading_time} min
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── Guide body ── */}
      <article className="container max-w-3xl py-12 md:py-16">
        {/* HTML content from Tiptap / admin */}
        <div
          className="tiptap-content prose prose-green max-w-none
            prose-headings:font-serif prose-headings:text-primary
            prose-a:text-accent prose-a:underline
            prose-img:rounded-lg
            prose-p:text-foreground prose-li:text-foreground
            prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(loc(guide.content)) }}
        />

        {/* ── Tags ── */}
        {guide.tags && guide.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {guide.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Bottom back link ── */}
        <div className="mt-12 border-t border-border pt-6">
          <Link
            to="/guides"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('guides.backToList')}
          </Link>
        </div>
      </article>
    </>
  )
}
