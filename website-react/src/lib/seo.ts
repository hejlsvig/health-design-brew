/**
 * SEO utilities for Shifting Source
 * Handles Open Graph, Twitter Cards, canonical URLs, hreflang, and JSON-LD
 *
 * All values (site URL, site name, etc.) are loaded from admin_settings
 * in the database — nothing is hardcoded.
 */
import { getSettings } from './openai'

const SUPPORTED_LANGS = ['da', 'en', 'se'] as const

// ── Cached config (loaded once from DB) ──────────────

let _config: { siteUrl: string; siteName: string; defaultImage: string; defaultDesc: string; gaId: string } | null = null

async function loadConfig() {
  if (_config) return _config
  try {
    const s = await getSettings()
    _config = {
      siteUrl: (s.site_url || 'https://shiftingsource.com').replace(/\/$/, ''),
      siteName: s.site_name || 'Shifting Source',
      defaultImage: s.seo_default_image || `${s.site_url || 'https://shiftingsource.com'}/og-default.jpg`,
      defaultDesc: s.seo_default_description || '',
      gaId: s.ga_measurement_id || '',
    }
  } catch {
    _config = {
      siteUrl: 'https://shiftingsource.com',
      siteName: 'Shifting Source',
      defaultImage: 'https://shiftingsource.com/og-default.jpg',
      defaultDesc: '',
      gaId: '',
    }
  }
  return _config
}

/** Pre-load config (call once on app boot) */
export async function initSEO() {
  const cfg = await loadConfig()

  // Inject Google Analytics if configured
  if (cfg.gaId && !document.getElementById('ga-script')) {
    const script = document.createElement('script')
    script.id = 'ga-script'
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.gaId}`
    document.head.appendChild(script)

    const inline = document.createElement('script')
    inline.id = 'ga-inline'
    inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${cfg.gaId}');`
    document.head.appendChild(inline)
  }

  // Inject Google Search Console verification if configured
  const s = await getSettings()
  if (s.seo_google_verification) {
    setMeta('google-site-verification', s.seo_google_verification)
  }
}

/** Get cached config synchronously (after initSEO has been called) */
function getConfig() {
  return _config || {
    siteUrl: 'https://shiftingsource.com',
    siteName: 'Shifting Source',
    defaultImage: 'https://shiftingsource.com/og-default.jpg',
    defaultDesc: '',
    gaId: '',
  }
}

// ── Public API ────────────────────────────────────────

export interface SEOData {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'article'
  publishedAt?: string
  modifiedAt?: string
  locale?: string
  noindex?: boolean
}

/**
 * Sets all meta tags for a page: OG, Twitter, canonical, hreflang, description
 */
export function setSEO(data: SEOData) {
  const cfg = getConfig()
  const {
    title,
    description,
    path,
    image = cfg.defaultImage,
    type = 'website',
    publishedAt,
    modifiedAt,
    locale = 'da_DK',
    noindex = false,
  } = data

  const fullTitle = `${title} — ${cfg.siteName}`
  const url = `${cfg.siteUrl}${path}`

  // Title
  document.title = fullTitle

  // Basic meta
  setMeta('description', description)
  if (noindex) {
    setMeta('robots', 'noindex, nofollow')
  } else {
    removeMeta('robots')
  }

  // Canonical
  setLink('canonical', url)

  // Hreflang alternates
  for (const lang of SUPPORTED_LANGS) {
    const hreflang = lang === 'se' ? 'sv' : lang
    setLink(`alternate-${hreflang}`, `${url}?lang=${lang}`, 'alternate', hreflang)
  }
  setLink('alternate-x-default', url, 'alternate', 'x-default')

  // Open Graph
  setProperty('og:type', type)
  setProperty('og:url', url)
  setProperty('og:title', fullTitle)
  setProperty('og:description', description)
  setProperty('og:image', image)
  setProperty('og:image:width', '1200')
  setProperty('og:image:height', '630')
  setProperty('og:site_name', cfg.siteName)
  setProperty('og:locale', locale)

  if (type === 'article') {
    if (publishedAt) setProperty('article:published_time', publishedAt)
    if (modifiedAt) setProperty('article:modified_time', modifiedAt)
  }

  // Twitter Cards
  setMeta('twitter:card', 'summary_large_image')
  setMeta('twitter:title', fullTitle)
  setMeta('twitter:description', description)
  setMeta('twitter:image', image)
}

/**
 * Injects Recipe JSON-LD structured data for Google rich results
 */
export function setRecipeJsonLd(recipe: {
  name: string
  description: string
  image?: string
  prepTime?: number
  totalTime?: number
  servings?: number
  calories?: number
  protein?: number
  fat?: number
  carbs?: number
  fiber?: number
  ingredients: string[]
  instructions: string[]
  categories?: string[]
  datePublished?: string
}) {
  const cfg = getConfig()
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description,
    author: { '@type': 'Organization', name: cfg.siteName, url: cfg.siteUrl },
    datePublished: recipe.datePublished || new Date().toISOString().split('T')[0],
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.instructions.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
    })),
  }

  if (recipe.image) ld.image = recipe.image
  if (recipe.prepTime) ld.prepTime = `PT${recipe.prepTime}M`
  if (recipe.totalTime) ld.cookTime = `PT${recipe.totalTime}M`
  if (recipe.servings) ld.recipeYield = `${recipe.servings}`
  if (recipe.categories?.length) {
    ld.recipeCategory = recipe.categories[0]
    ld.keywords = recipe.categories.join(', ')
  }

  // Nutrition
  if (recipe.calories || recipe.protein || recipe.fat || recipe.carbs) {
    const nutrition: Record<string, string> = { '@type': 'NutritionInformation' }
    if (recipe.calories) nutrition.calories = `${recipe.calories} calories`
    if (recipe.protein) nutrition.proteinContent = `${recipe.protein}g`
    if (recipe.fat) nutrition.fatContent = `${recipe.fat}g`
    if (recipe.carbs) nutrition.carbohydrateContent = `${recipe.carbs}g`
    if (recipe.fiber) nutrition.fiberContent = `${recipe.fiber}g`
    ld.nutrition = nutrition
  }

  injectJsonLd('recipe-jsonld', ld)
}

/**
 * Injects Article JSON-LD structured data
 */
export function setArticleJsonLd(article: {
  title: string
  description: string
  image?: string
  publishedAt?: string
  modifiedAt?: string
  url: string
  categories?: string[]
}) {
  const cfg = getConfig()
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: `${cfg.siteUrl}${article.url}`,
    author: { '@type': 'Organization', name: cfg.siteName, url: cfg.siteUrl },
    publisher: {
      '@type': 'Organization',
      name: cfg.siteName,
      url: cfg.siteUrl,
      logo: { '@type': 'ImageObject', url: `${cfg.siteUrl}/favicon.svg` },
    },
  }

  if (article.image) ld.image = article.image
  if (article.publishedAt) ld.datePublished = article.publishedAt
  if (article.modifiedAt) ld.dateModified = article.modifiedAt
  if (article.categories?.length) ld.keywords = article.categories.join(', ')

  injectJsonLd('article-jsonld', ld)
}

/**
 * Removes all injected SEO elements (call on unmount)
 */
export function clearSEO() {
  const cfg = getConfig()
  document.title = `${cfg.siteName} — Keto & Fasting Lifestyle`
  // Remove JSON-LD
  document.getElementById('recipe-jsonld')?.remove()
  document.getElementById('article-jsonld')?.remove()
}

// ── Helpers ──

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

function removeMeta(name: string) {
  document.querySelector(`meta[name="${name}"]`)?.remove()
}

function setProperty(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.content = content
}

function setLink(id: string, href: string, rel = 'canonical', hreflang?: string) {
  let el = document.getElementById(`seo-link-${id}`) as HTMLLinkElement | null
  if (!el) {
    el = document.createElement('link')
    el.id = `seo-link-${id}`
    el.rel = rel
    if (hreflang) el.hreflang = hreflang
    document.head.appendChild(el)
  }
  el.href = href
}

function injectJsonLd(id: string, data: Record<string, unknown>) {
  let el = document.getElementById(id) as HTMLScriptElement | null
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}
