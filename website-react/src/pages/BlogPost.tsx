import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import DOMPurify from 'dompurify'
import { ArrowLeft, Clock, ExternalLink, Tag, BookOpen, Edit3, Play, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCategoryLabel, getTagLabel } from '@/lib/articleCategories'
import { setSEO, setArticleJsonLd, clearSEO } from '@/lib/seo'
import { handleImageError } from '@/lib/imageFallback'

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
  featured_image: string | null
  published_at: string | null
  original_published_at: string | null
  seo_title: Record<string, string> | null
  seo_description: Record<string, string> | null
  video_url: Record<string, string> | null
  video_type: string | null
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const { isAdmin } = useAuth()
  const lang = i18n.language || 'da'
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [videoExpanded, setVideoExpanded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoTimeRef = useRef(0)

  useEffect(() => {
    if (slug) fetchArticle(slug)
  }, [slug])

  useEffect(() => {
    if (article) {
      const seoTitle = loc(article.seo_title) || loc(article.title)
      const seoDesc = loc(article.seo_description) || loc(article.summary) || ''

      setSEO({
        title: seoTitle,
        description: seoDesc,
        path: `/blog/${article.slug}`,
        image: article.featured_image || undefined,
        type: 'article',
        publishedAt: article.published_at || undefined,
        locale: lang === 'da' ? 'da_DK' : lang === 'se' ? 'sv_SE' : 'en_US',
      })

      setArticleJsonLd({
        title: seoTitle,
        description: seoDesc,
        image: article.featured_image || undefined,
        publishedAt: article.original_published_at || article.published_at || undefined,
        url: `/blog/${article.slug}`,
        categories: article.categories,
      })
    }
    return () => { clearSEO() }
  }, [article, lang])

  const fetchArticle = async (articleSlug: string) => {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', articleSlug)
      .eq('status', 'published')
      .single()

    if (error || !data) {
      setNotFound(true)
    } else {
      setArticle(data)
    }
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
      { day: 'numeric', month: 'long', year: 'numeric' }
    )
  }

  const readTime = (a: Article) => {
    const html = loc(a.content)
    const text = html.replace(/<[^>]*>/g, '')
    const words = text.split(/\s+/).length
    return `${Math.max(3, Math.ceil(words / 200))} min`
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
  if (notFound || !article) {
    return (
      <div className="container py-20 text-center space-y-4">
        <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="font-serif text-2xl text-primary">{t('blog.notFound')}</h1>
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('blog.backToList')}
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
        {article.featured_image && (
          <img
            src={article.featured_image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
            onError={handleImageError}
          />
        )}
        <div className="overlay-gradient absolute inset-0 z-10" />

        <div className="container relative z-20 pb-10 pt-24 md:pb-14 md:pt-28">
          {/* Back link + Admin edit */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/blog"
              className="inline-flex items-center gap-2 text-sm text-[hsl(var(--charcoal-foreground))]/70 hover:text-[hsl(var(--charcoal-foreground))] transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('blog.backToList')}
            </Link>
            {isAdmin && (
              <Link
                to={`/admin/blog?edit=${article.slug}`}
                className="inline-flex items-center gap-2 rounded-md bg-accent/90 px-3 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                {t('admin.edit')}
              </Link>
            )}
          </div>

          {/* Badges */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            {(article.categories || []).map(cat => (
              <span key={cat} className="rounded-full bg-accent px-3 py-0.5 text-xs font-bold uppercase text-accent-foreground">
                {getCategoryLabel(cat, lang)}
              </span>
            ))}
            {article.source_title && (
              <span className="rounded-full border border-[hsl(var(--charcoal-foreground))]/20 px-3 py-0.5 text-xs font-medium text-[hsl(var(--charcoal-foreground))]/80">
                {article.source_title}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="max-w-2xl font-serif text-3xl leading-tight text-[hsl(var(--charcoal-foreground))] md:text-5xl">
            {loc(article.title)}
          </h1>

          {/* Summary */}
          {article.summary && (
            <p className="mt-4 max-w-xl text-base text-[hsl(var(--charcoal-foreground))]/80">
              {loc(article.summary)}
            </p>
          )}

          {/* Meta */}
          <div className="mt-6 flex items-center gap-4 text-xs text-[hsl(var(--charcoal-foreground))]/60">
            {article.original_published_at && (
              <span>{t('blog.originallyPublished')}: {formatDate(article.original_published_at)}</span>
            )}
            {article.published_at && (
              <span>{t('blog.sitePublished')}: {formatDate(article.published_at)}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {readTime(article)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Explainer video (with language fallback: lang → da → first available) ── */}
      {(() => {
        const videoSrc = article.video_url?.[lang]
          || article.video_url?.['da']
          || (article.video_url ? Object.values(article.video_url)[0] : null)
        if (!videoSrc) return null

        const collapseVideo = () => {
          if (videoRef.current) {
            videoTimeRef.current = videoRef.current.currentTime
          }
          videoRef.current?.pause()
          setVideoExpanded(false)
        }

        return (
          <section className="border-b border-border bg-muted/60">
            <div className="container max-w-3xl py-5 md:py-6">
              {!videoExpanded ? (
                /* ── Compact: preview card with play overlay ── */
                <button
                  onClick={() => {
                    setVideoExpanded(true)
                    setTimeout(() => {
                      const v = videoRef.current
                      if (v) {
                        if (videoTimeRef.current > 0) v.currentTime = videoTimeRef.current
                        v.play()
                      }
                    }, 150)
                  }}
                  className="group relative w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-video max-h-48 w-full bg-black/80">
                    <video
                      src={videoSrc}
                      preload="metadata"
                      muted
                      playsInline
                      className="absolute inset-0 h-full w-full object-cover opacity-50"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/90 text-accent-foreground shadow-lg transition-transform group-hover:scale-110">
                        <Play className="h-6 w-6 ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2.5 text-left">
                    <Play className="h-3.5 w-3.5 text-accent shrink-0" />
                    <span className="text-sm font-medium text-foreground">
                      {t('blog.explainerVideo', 'Se video-forklaring')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      — {t('blog.clickToPlay', 'Klik for at afspille')}
                    </span>
                  </div>
                </button>
              ) : (
                /* ── Expanded: full-width player ── */
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4 text-accent" />
                      <span className="text-sm font-medium text-foreground/80">
                        {t('blog.explainerVideo', 'Se video-forklaring')}
                      </span>
                    </div>
                    <button
                      onClick={collapseVideo}
                      className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      aria-label={t('common.close', 'Luk')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border shadow-lg bg-black">
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      controls
                      preload="metadata"
                      playsInline
                      className="w-full max-h-[500px]"
                      onPause={() => {
                        const v = videoRef.current
                        if (v) videoTimeRef.current = v.currentTime
                        // Auto-collapse when paused (but not when seeking)
                        if (v && (v.ended || (v.paused && !v.seeking))) {
                          setTimeout(() => {
                            if (videoRef.current?.paused) setVideoExpanded(false)
                          }, 600)
                        }
                      }}
                      onEnded={() => {
                        videoTimeRef.current = 0
                        setVideoExpanded(false)
                      }}
                    >
                      {t('blog.videoNotSupported', 'Din browser understøtter ikke video.')}
                    </video>
                  </div>
                </div>
              )}
            </div>
          </section>
        )
      })()}

      {/* ── Article body ── */}
      <article className="container max-w-3xl py-12 md:py-16">
        {/* HTML content from Tiptap / admin */}
        <div
          className="tiptap-content prose prose-green max-w-none
            prose-headings:font-serif prose-headings:text-primary
            prose-a:text-accent prose-a:underline
            prose-img:rounded-lg
            prose-p:text-foreground prose-li:text-foreground
            prose-strong:text-foreground"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(loc(article.content)) }}
        />

        {/* ── Source reference card ── */}
        {article.source_url && (
          <div className="mt-10 rounded-md border border-border bg-muted/50 p-5">
            <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('blog.source')}
            </p>
            <a
              href={article.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {article.source_title || article.source_url}
            </a>
          </div>
        )}

        {/* ── Tags ── */}
        {article.tags && article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                <Tag className="h-3 w-3" />
                {getTagLabel(tag, lang)}
              </span>
            ))}
          </div>
        )}

        {/* ── Bottom back link ── */}
        <div className="mt-12 border-t border-border pt-6">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('blog.backToList')}
          </Link>
        </div>
      </article>
    </>
  )
}
