import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Flame, Heart, Clock, Utensils, BookOpen, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getCategoryLabel } from '@/lib/articleCategories'
import { setSEO, clearSEO } from '@/lib/seo'
import { handleImageError } from '@/lib/imageFallback'

/* ─── Types ─── */
interface PageSection {
  id: string
  section_type: string
  sort_order: number
  enabled: boolean
  content: Record<string, any>
}

interface RecipePreview {
  id: string; slug: string; title: Record<string, string>; image_url: string | null
  total_time: number | null; calories: number | null; categories: string[] | Record<string, string[]> | null
}

interface ArticlePreview {
  id: string; slug: string; title: Record<string, string>; summary: Record<string, string> | null
  featured_image: string | null; categories: string[] | Record<string, string[]>; published_at: string | null; original_published_at: string | null
}

/* ─── Helpers ─── */
function resolveStringArray(data: string[] | Record<string, string[]> | null | undefined, lang: string): string[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data[lang] || data['da'] || []
}
function shuffleAndPick<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

/* ─── Component ─── */
export default function Home() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || 'da'

  const [sections, setSections] = useState<PageSection[]>([])
  const [recipes, setRecipes] = useState<RecipePreview[]>([])
  const [articles, setArticles] = useState<ArticlePreview[]>([])
  const [featuredRecipes, setFeaturedRecipes] = useState<RecipePreview[]>([])
  const [featuredArticles, setFeaturedArticles] = useState<ArticlePreview[]>([])

  const loc = (field: Record<string, string> | null | undefined, fallback = '') => {
    if (!field) return fallback
    return field[lang] || field['da'] || field['en'] || fallback
  }

  // SEO for homepage
  useEffect(() => {
    setSEO({
      title: 'Keto & Fasting Lifestyle',
      description: 'Videnskabsbaserede keto-opskrifter, fasteprotokoller og guides til et sundere liv. Beregn dit daglige kaloriebehov og find skræddersyede måltidsplaner.',
      path: '/',
      locale: lang === 'da' ? 'da_DK' : lang === 'se' ? 'sv_SE' : 'en_US',
    })
    return () => { clearSEO() }
  }, [lang])

  useEffect(() => {
    const loadSections = async () => {
      const { data, error } = await supabase.from('page_sections')
        .select('*')
        .eq('page', 'home')
        .eq('enabled', true)
        .order('sort_order')
      if (error || !data) { console.error('[Home] Failed to load sections:', error); return }
      setSections(data)

      // Fetch latest recipes
      const recipeSection = data.find(s => s.section_type === 'latest_recipes')
      if (recipeSection) {
        const count = recipeSection.content?.count || 3
        const { data: r } = await supabase.from('recipes')
          .select('id,slug,title,image_url,total_time,calories,categories')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(count)
        if (r) setRecipes(r)
      }

      // Fetch latest articles
      const articleSection = data.find(s => s.section_type === 'latest_articles')
      if (articleSection) {
        const count = articleSection.content?.count || 3
        const { data: a } = await supabase.from('articles')
          .select('id,slug,title,summary,featured_image,categories,published_at,original_published_at')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(count)
        if (a) setArticles(a)
      }

      // Fetch featured recipes
      const featuredRecipeSection = data.find(s => s.section_type === 'featured_recipes')
      if (featuredRecipeSection) {
        const { data: r } = await supabase.from('recipes')
          .select('id,slug,title,image_url,total_time,calories,categories')
          .eq('status', 'published')
          .eq('featured', true)
        if (r && r.length >= 3) {
          setFeaturedRecipes(shuffleAndPick(r, 3))
        } else {
          const existing = r || []
          const needed = 3 - existing.length
          if (needed > 0) {
            const { data: fill } = await supabase.from('recipes')
              .select('id,slug,title,image_url,total_time,calories,categories')
              .eq('status', 'published')
              .order('created_at', { ascending: false })
              .limit(needed)
            setFeaturedRecipes([...existing, ...(fill || [])])
          } else {
            setFeaturedRecipes(existing)
          }
        }
      }

      // Fetch featured articles
      const featuredArticleSection = data.find(s => s.section_type === 'featured_articles')
      if (featuredArticleSection) {
        const { data: a } = await supabase.from('articles')
          .select('id,slug,title,summary,featured_image,categories,published_at,original_published_at')
          .eq('status', 'published')
          .eq('featured', true)
        if (a && a.length >= 3) {
          setFeaturedArticles(shuffleAndPick(a, 3))
        } else {
          const existing = a || []
          const needed = 3 - existing.length
          if (needed > 0) {
            const { data: fill } = await supabase.from('articles')
              .select('id,slug,title,summary,featured_image,categories,published_at,original_published_at')
              .eq('status', 'published')
              .order('published_at', { ascending: false })
              .limit(needed)
            setFeaturedArticles([...existing, ...(fill || [])])
          } else {
            setFeaturedArticles(existing)
          }
        }
      }
    }
    loadSections().catch(err => console.error('[Home] Unexpected error:', err))
  }, [])

  return (
    <div className="space-y-0">
      {sections.map(section => {
        switch (section.section_type) {
          case 'hero':
            return <HeroSection key={section.id} content={section.content} loc={loc} />
          case 'latest_recipes':
            return <LatestRecipesSection key={section.id} recipes={recipes} loc={loc} t={t} lang={lang} />
          case 'latest_articles':
            return <LatestArticlesSection key={section.id} articles={articles} loc={loc} t={t} lang={lang} />
          case 'featured_recipes':
            return <FeaturedRecipesSection key={section.id} recipes={featuredRecipes} loc={loc} t={t} lang={lang} />
          case 'featured_articles':
            return <FeaturedArticlesSection key={section.id} articles={featuredArticles} loc={loc} t={t} lang={lang} />
          case 'about':
            return <AboutSection key={section.id} content={section.content} loc={loc} t={t} />
          case 'content_block':
            return <ContentBlockSection key={section.id} content={section.content} loc={loc} />
          case 'faq':
            return <FaqSection key={section.id} content={section.content} loc={loc} />
          case 'cta_banner':
            return <CtaBannerSection key={section.id} content={section.content} loc={loc} />
          default:
            return null
        }
      })}

      {/* Fallback if no sections loaded yet */}
      {sections.length === 0 && (
        <section className="relative overflow-hidden bg-charcoal mt-2.5">
          <div className="absolute inset-0 overlay-gradient" />
          <div className="relative container flex items-center justify-center min-h-[500px] py-16">
            <div className="text-center space-y-5 px-4 max-w-2xl">
              <h1 className="font-serif text-4xl md:text-5xl font-extrabold text-charcoal-foreground drop-shadow-lg leading-tight">
                {t('hero.title')}
              </h1>
              <p className="text-charcoal-foreground/70 text-base md:text-lg max-w-lg mx-auto">
                {t('hero.subtitle')}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

/* ═══ HERO SECTION ═══ */
function HeroSection({ content, loc }: { content: Record<string, any>; loc: (f: any, fb?: string) => string }) {
  const bgImage = content.bg_image
  const bgVideo = content.bg_video
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return

    const onEnded = () => {
      // 1) Hold last frame for 5 seconds
      setTimeout(() => {
        // 2) Fade to 80% opacity over 15 seconds
        v.style.transition = 'opacity 15s ease-in-out'
        v.style.opacity = '0.8'

        // 3) After 15s fade completes, restart
        setTimeout(() => {
          v.style.transition = 'none'
          v.style.opacity = '0'
          v.currentTime = 0
          v.play().catch(() => {})
          // Quick fade in
          requestAnimationFrame(() => {
            v.style.transition = 'opacity 1.5s ease-in-out'
            v.style.opacity = '1'
          })
        }, 15000)
      }, 5000)
    }

    v.addEventListener('ended', onEnded)
    return () => v.removeEventListener('ended', onEnded)
  }, [])

  return (
    <section className="relative overflow-hidden bg-charcoal mt-2.5">
      {bgVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          poster={bgImage || undefined}
        >
          <source src={bgVideo} type="video/mp4" />
        </video>
      ) : bgImage ? (
        <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 overlay-gradient" />
      <div className="absolute inset-0 overlay-dots opacity-40" />
      <div className="absolute inset-0 overlay-grain opacity-20" />

      <div className="relative container flex items-center justify-center min-h-[500px] md:min-h-[550px] py-16">
        <div className="text-center space-y-5 px-4 max-w-2xl">
          <p className="text-xs font-sans font-bold uppercase tracking-widest text-accent">
            {loc(content.tagline)}
          </p>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-extrabold text-charcoal-foreground drop-shadow-lg leading-tight">
            {loc(content.title)}
          </h1>
          <p className="text-charcoal-foreground/70 text-base md:text-lg max-w-lg mx-auto">
            {loc(content.subtitle)}
          </p>
          {content.cta_link && (
            <Link
              to={content.cta_link}
              className="inline-flex items-center h-11 px-6 rounded-md bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-colors"
            >
              {loc(content.cta_text, 'Explore')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

/* ═══ LATEST RECIPES ═══ */
function LatestRecipesSection({ recipes, loc, t, lang }: {
  recipes: RecipePreview[]; loc: (f: any, fb?: string) => string; t: (k: string) => string; lang: string
}) {
  return (
    <section className="container py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Utensils className="h-6 w-6 text-accent" />
          <h2 className="text-3xl font-serif font-bold text-primary">{t('home.latestRecipes')}</h2>
        </div>
        <Link to="/recipes" className="text-sm text-accent font-semibold hover:text-accent/80 flex items-center gap-1 transition-colors">
          {t('home.viewAllRecipes')} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recipes.map(recipe => (
            <Link key={recipe.id} to={`/recipes?recipe=${recipe.slug}`} className="group overflow-hidden rounded-md border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
              <div className="relative aspect-[4/3] overflow-hidden bg-charcoal">
                <div className="absolute inset-0 overlay-gradient z-10" />
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt={loc(recipe.title)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={handleImageError} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"><Utensils className="h-10 w-10 text-charcoal-foreground/30" /></div>
                )}
                <div className="absolute left-3 bottom-3 z-20 flex flex-wrap gap-1">
                  {resolveStringArray(recipe.categories, lang).slice(0, 2).map(cat => (
                    <span key={cat} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">{cat}</span>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-serif text-lg text-foreground group-hover:text-accent transition-colors line-clamp-1">{loc(recipe.title)}</h3>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {recipe.total_time != null && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{recipe.total_time} min</span>}
                  {recipe.calories != null && <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{recipe.calories} kcal</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t('home.noRecipesYet')}</p>
      )}
    </section>
  )
}

/* ═══ FEATURED RECIPES ═══ */
function FeaturedRecipesSection({ recipes, loc, t, lang }: {
  recipes: RecipePreview[]; loc: (f: any, fb?: string) => string; t: (k: string) => string; lang: string
}) {
  if (recipes.length < 3) return null
  const [main, ...rest] = recipes

  return (
    <section className="container py-16">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Utensils className="h-6 w-6 text-accent" />
          <h2 className="text-3xl font-serif font-bold text-primary">{t('home.featuredRecipes')}</h2>
        </div>
        <Link to="/recipes" className="text-sm text-accent font-semibold hover:text-accent/80 flex items-center gap-1 transition-colors">
          {t('home.viewAllRecipes')} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Large card - spans 2 cols and 2 rows */}
        <Link to={`/recipes?recipe=${main.slug}`} className="md:col-span-2 md:row-span-2 group overflow-hidden rounded-md border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="relative aspect-[4/3] md:aspect-auto md:h-full overflow-hidden bg-charcoal">
            <div className="absolute inset-0 overlay-gradient z-10" />
            {main.image_url ? (
              <img src={main.image_url} alt={loc(main.title)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <div className="flex h-full w-full items-center justify-center"><Utensils className="h-16 w-16 text-charcoal-foreground/30" /></div>
            )}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
              <div className="flex flex-wrap gap-1 mb-2">
                {resolveStringArray(main.categories, lang).slice(0, 2).map(cat => (
                  <span key={cat} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">{cat}</span>
                ))}
              </div>
              <h3 className="font-serif text-2xl md:text-3xl text-charcoal-foreground group-hover:text-accent transition-colors">{loc(main.title)}</h3>
              <div className="mt-2 flex items-center gap-3 text-sm text-charcoal-foreground/70">
                {main.total_time != null && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{main.total_time} min</span>}
                {main.calories != null && <span className="flex items-center gap-1"><Flame className="h-4 w-4" />{main.calories} kcal</span>}
              </div>
            </div>
          </div>
        </Link>

        {/* Two smaller cards stacked on right */}
        {rest.slice(0, 2).map(recipe => (
          <Link key={recipe.id} to={`/recipes?recipe=${recipe.slug}`} className="group overflow-hidden rounded-md border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="relative aspect-[16/9] overflow-hidden bg-charcoal">
              <div className="absolute inset-0 overlay-gradient z-10" />
              {recipe.image_url ? (
                <img src={recipe.image_url} alt={loc(recipe.title)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><Utensils className="h-10 w-10 text-charcoal-foreground/30" /></div>
              )}
              <div className="absolute left-3 bottom-3 z-20 flex flex-wrap gap-1">
                {resolveStringArray(recipe.categories, lang).slice(0, 2).map(cat => (
                  <span key={cat} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground">{cat}</span>
                ))}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-serif text-lg text-foreground group-hover:text-accent transition-colors line-clamp-1">{loc(recipe.title)}</h3>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                {recipe.total_time != null && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{recipe.total_time} min</span>}
                {recipe.calories != null && <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{recipe.calories} kcal</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ═══ LATEST ARTICLES ═══ */
function LatestArticlesSection({ articles, loc, t, lang }: {
  articles: ArticlePreview[]; loc: (f: any, fb?: string) => string; t: (k: string) => string; lang: string
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'da' ? 'da-DK' : lang === 'se' ? 'sv-SE' : 'en-GB')
  }

  return (
    <section className="bg-secondary/10">
      <div className="container py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-accent" />
            <h2 className="text-3xl font-serif font-bold text-primary">{t('home.latestStudies')}</h2>
          </div>
          <Link to="/blog" className="text-sm text-accent font-semibold hover:text-accent/80 flex items-center gap-1 transition-colors">
            {t('home.viewAllStudies')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {articles.map(article => {
              const displayDate = article.original_published_at || article.published_at
              return (
                <Link key={article.id} to={`/blog/${article.slug}`} className="group overflow-hidden rounded-md border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative aspect-[16/9] overflow-hidden bg-charcoal">
                    <div className="absolute inset-0 overlay-gradient z-10" />
                    {article.featured_image ? (
                      <img src={article.featured_image} alt={loc(article.title)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={handleImageError} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-10 w-10 text-charcoal-foreground/30" /></div>
                    )}
                    <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1">
                      {resolveStringArray(article.categories, lang).slice(0, 2).map(cat => (
                        <span key={cat} className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground uppercase">{getCategoryLabel(cat, lang)}</span>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-serif text-lg text-foreground group-hover:text-accent transition-colors line-clamp-2">{loc(article.title)}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{loc(article.summary)}</p>
                    {displayDate && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(displayDate)}
                      </p>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t('home.noStudiesYet')}</p>
        )}
      </div>
    </section>
  )
}

/* ═══ FEATURED ARTICLES ═══ */
function FeaturedArticlesSection({ articles, loc, t, lang }: {
  articles: ArticlePreview[]; loc: (f: any, fb?: string) => string; t: (k: string) => string; lang: string
}) {
  if (articles.length < 3) return null
  const [main, ...rest] = articles

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'da' ? 'da-DK' : lang === 'se' ? 'sv-SE' : 'en-GB')
  }

  const displayDate = main.original_published_at || main.published_at

  return (
    <section className="bg-secondary/10">
      <div className="container py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-accent" />
            <h2 className="text-3xl font-serif font-bold text-primary">{t('home.featuredArticles')}</h2>
          </div>
          <Link to="/blog" className="text-sm text-accent font-semibold hover:text-accent/80 flex items-center gap-1 transition-colors">
            {t('home.viewAllStudies')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Two smaller cards stacked on left */}
          {rest.slice(0, 2).map(article => {
            const displayDate = article.original_published_at || article.published_at
            return (
              <Link key={article.id} to={`/blog/${article.slug}`} className="group overflow-hidden rounded-md border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-[16/9] overflow-hidden bg-charcoal">
                  <div className="absolute inset-0 overlay-gradient z-10" />
                  {article.featured_image ? (
                    <img src={article.featured_image} alt={loc(article.title)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={handleImageError} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-10 w-10 text-charcoal-foreground/30" /></div>
                  )}
                  <span className="absolute top-3 left-3 z-20 rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground uppercase">{resolveStringArray(article.categories, lang)[0] || ''}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-lg text-foreground group-hover:text-accent transition-colors line-clamp-2">{loc(article.title)}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{loc(article.summary)}</p>
                  {displayDate && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(displayDate)}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}

          {/* Large card - spans 2 cols and 2 rows on right */}
          <Link to={`/blog/${main.slug}`} className="md:col-span-2 md:row-span-2 group overflow-hidden rounded-md border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="relative aspect-[4/3] md:aspect-auto md:h-full overflow-hidden bg-charcoal">
              <div className="absolute inset-0 overlay-gradient z-10" />
              {main.featured_image ? (
                <img src={main.featured_image} alt={loc(main.title)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={handleImageError} />
              ) : (
                <div className="flex h-full w-full items-center justify-center"><BookOpen className="h-16 w-16 text-charcoal-foreground/30" /></div>
              )}
              <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
                <div className="flex flex-wrap gap-1 mb-2">
                  {resolveStringArray(main.categories, lang).slice(0, 2).map(cat => (
                    <span key={cat} className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-foreground uppercase">{getCategoryLabel(cat, lang)}</span>
                  ))}
                </div>
                <h3 className="font-serif text-2xl md:text-3xl text-charcoal-foreground group-hover:text-accent transition-colors">{loc(main.title)}</h3>
                <p className="mt-2 text-sm text-charcoal-foreground/80 line-clamp-2">{loc(main.summary)}</p>
                {displayDate && (
                  <p className="mt-2 text-sm text-charcoal-foreground/70">
                    {formatDate(displayDate)}
                  </p>
                )}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ═══ ABOUT / MISSION ═══ */
function AboutSection({ content, loc, t }: {
  content: Record<string, any>; loc: (f: any, fb?: string) => string; t: (k: string) => string
}) {
  const image = content.image
  return (
    <section>
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <p className="text-xs font-sans font-bold uppercase tracking-widest text-accent">
              {loc(content.tagline)}
            </p>
            <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-primary">
              {loc(content.title)}
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              {loc(content.description)}
            </p>
            <div className="flex items-center gap-6 pt-2">
              <span className="flex items-center gap-2 text-sm text-primary font-medium">
                <Flame className="h-4 w-4" /> {t('about.scienceBacked')}
              </span>
              <span className="flex items-center gap-2 text-sm text-primary font-medium">
                <Heart className="h-4 w-4" /> {t('about.resultsDriven')}
              </span>
            </div>
          </div>

          {image ? (
            <img src={image} alt="" className="rounded-md min-h-[280px] object-cover" />
          ) : (
            <div className="bg-charcoal rounded-md min-h-[280px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 overlay-grain opacity-30" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ═══ CONTENT BLOCK (Fritekst + Billede) ═══ */
function ContentBlockSection({ content, loc }: { content: Record<string, any>; loc: (f: any, fb?: string) => string }) {
  const image = content.image
  const layout = content.layout || 'image_right'
  const title = loc(content.title)
  const text = loc(content.text)

  if (!title && !text) return null

  const textCol = (
    <div className="space-y-4">
      {title && (
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-primary">{title}</h2>
      )}
      {text && (
        <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{text}</p>
      )}
    </div>
  )

  const imageCol = image ? (
    <img src={image} alt="" className="rounded-md w-full min-h-[250px] object-cover" />
  ) : null

  return (
    <section>
      <div className="container py-16">
        {imageCol ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {layout === 'image_left' ? <>{imageCol}{textCol}</> : <>{textCol}{imageCol}</>}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">{textCol}</div>
        )}
      </div>
    </section>
  )
}

/* ═══ FAQ SECTION ═══ */
function FaqSection({ content, loc }: { content: Record<string, any>; loc: (f: any, fb?: string) => string }) {
  const items: Array<{ question: Record<string, string>; answer: Record<string, string> }> = content.items || []
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  if (items.length === 0) return null

  return (
    <section className="bg-secondary/5">
      <div className="container py-16">
        <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-primary text-center mb-10">
          {loc(content.title, 'FAQ')}
        </h2>

        <div className="max-w-2xl mx-auto divide-y divide-border">
          {items.map((item, idx) => {
            const question = loc(item.question)
            const answer = loc(item.answer)
            if (!question) return null
            const isOpen = openIdx === idx

            return (
              <div key={idx}>
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                  className="w-full flex items-center justify-between py-5 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-sm"
                >
                  <span className="font-serif text-lg font-bold text-foreground group-hover:text-accent transition-colors pr-4">
                    {question}
                  </span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  id={`faq-answer-${idx}`}
                  role="region"
                  aria-labelledby={`faq-question-${idx}`}
                  className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-96 pb-5' : 'max-h-0'}`}
                >
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{answer}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ═══ CTA BANNER ═══ */
function CtaBannerSection({ content, loc }: { content: Record<string, any>; loc: (f: any, fb?: string) => string }) {
  const bgImage = content.bg_image
  const title = loc(content.title)
  if (!title) return null

  return (
    <section className="relative overflow-hidden bg-charcoal">
      {bgImage ? (
        <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 overlay-gradient" />
      <div className="absolute inset-0 overlay-grain opacity-20" />

      <div className="relative container py-16 md:py-20">
        <div className="text-center space-y-5 px-4 max-w-2xl mx-auto">
          {loc(content.tagline) && (
            <p className="text-xs font-sans font-bold uppercase tracking-widest text-accent">
              {loc(content.tagline)}
            </p>
          )}
          <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-charcoal-foreground drop-shadow-lg leading-tight">
            {title}
          </h2>
          {loc(content.text) && (
            <p className="text-charcoal-foreground/70 text-base md:text-lg max-w-lg mx-auto">
              {loc(content.text)}
            </p>
          )}
          {content.cta_link && (
            <Link
              to={content.cta_link}
              className="inline-flex items-center h-11 px-6 rounded-md bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-colors"
            >
              {loc(content.cta_text, 'Læs mere')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
