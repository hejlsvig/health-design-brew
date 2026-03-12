import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { setSEO, clearSEO } from '@/lib/seo'

/* ─── Types ─── */
interface PageSection {
  id: string
  section_type: string
  sort_order: number
  enabled: boolean
  content: Record<string, any>
}

/* ─── Component ─── */
export default function Terms() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || 'da'

  const [sections, setSections] = useState<PageSection[]>([])
  const [loaded, setLoaded] = useState(false)

  const loc = (field: Record<string, string> | null | undefined, fallback = '') => {
    if (!field) return fallback
    return field[lang] || field['da'] || field['en'] || fallback
  }

  useEffect(() => {
    setSEO({
      title: t('terms.title', 'Terms of Service'),
      description: t('terms.seo_description', 'Read our terms of service for using the platform.'),
      path: '/terms',
    })
    return () => clearSEO()
  }, [t])

  useEffect(() => {
    supabase.from('page_sections')
      .select('*')
      .eq('page', 'terms')
      .eq('enabled', true)
      .order('sort_order')
      .then(({ data }) => {
        if (data) {
          setSections(data)
        }
        setLoaded(true)
      })
  }, [])

  return (
    <div className="space-y-0">
      {/* Simple hero with page title */}
      <section className="relative overflow-hidden bg-charcoal mt-2.5">
        <div className="absolute inset-0 overlay-gradient" />
        <div className="relative container flex items-center justify-center min-h-[400px] py-16">
          <div className="text-center space-y-5 px-4 max-w-2xl">
            <h1 className="font-serif text-4xl md:text-5xl font-extrabold text-charcoal-foreground drop-shadow-lg leading-tight">
              {t('termsPage.title')}
            </h1>
          </div>
        </div>
      </section>

      {/* Render sections */}
      {sections.length > 0 ? (
        sections.map(section => {
          switch (section.section_type) {
            case 'content_block':
              return <ContentBlockSection key={section.id} content={section.content} loc={loc} />
            case 'faq':
              return <FaqSection key={section.id} content={section.content} loc={loc} />
            case 'cta_banner':
              return <CtaBannerSection key={section.id} content={section.content} loc={loc} />
            default:
              return null
          }
        })
      ) : loaded ? (
        <section className="bg-secondary/5">
          <div className="container py-16">
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {t('termsPage.placeholder', 'We are preparing our terms of service. Please check back soon.')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('termsPage.notice', 'By using the Shifting Source website and services, you agree to comply with our terms and conditions.')}
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
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
