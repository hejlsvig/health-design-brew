/**
 * Sitemap generator for Shifting Source
 * Run: npx tsx scripts/generate-sitemap.ts
 *
 * Generates sitemap.xml with:
 * - Static pages (home, recipes, blog, guides, etc.)
 * - Dynamic pages (individual blog posts, recipes, guides from Supabase)
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

const SITE_URL = process.env.SITE_URL || 'https://shiftingsource.com'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://hllprmlkuchhfmexzpad.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

async function generateSitemap() {
  const entries: SitemapEntry[] = []

  // Static pages
  const staticPages: SitemapEntry[] = [
    { loc: '/', changefreq: 'daily', priority: 1.0 },
    { loc: '/recipes', changefreq: 'daily', priority: 0.9 },
    { loc: '/blog', changefreq: 'daily', priority: 0.9 },
    { loc: '/guides', changefreq: 'weekly', priority: 0.8 },
    { loc: '/calculator', changefreq: 'monthly', priority: 0.7 },
    { loc: '/about', changefreq: 'monthly', priority: 0.5 },
    { loc: '/privacy', changefreq: 'yearly', priority: 0.3 },
    { loc: '/terms', changefreq: 'yearly', priority: 0.3 },
  ]
  entries.push(...staticPages)

  // Dynamic pages from Supabase
  if (SUPABASE_ANON_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Published articles
    const { data: articles } = await supabase
      .from('articles')
      .select('slug, published_at, updated_at')
      .eq('status', 'published')

    if (articles) {
      for (const article of articles) {
        entries.push({
          loc: `/blog/${article.slug}`,
          lastmod: article.updated_at || article.published_at || undefined,
          changefreq: 'weekly',
          priority: 0.8,
        })
      }
    }

    // Published recipes
    const { data: recipes } = await supabase
      .from('recipes')
      .select('slug, updated_at, created_at')
      .eq('status', 'published')

    if (recipes) {
      for (const recipe of recipes) {
        entries.push({
          loc: `/recipes?recipe=${recipe.slug}`,
          lastmod: recipe.updated_at || recipe.created_at || undefined,
          changefreq: 'weekly',
          priority: 0.8,
        })
      }
    }

    // Published guides
    const { data: guides } = await supabase
      .from('guides')
      .select('slug, updated_at, created_at')
      .eq('status', 'published')

    if (guides) {
      for (const guide of guides) {
        entries.push({
          loc: `/guides/${guide.slug}`,
          lastmod: guide.updated_at || guide.created_at || undefined,
          changefreq: 'monthly',
          priority: 0.7,
        })
      }
    }
  }

  // Build XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map(e => `  <url>
    <loc>${SITE_URL}${e.loc}</loc>${e.lastmod ? `\n    <lastmod>${new Date(e.lastmod).toISOString().split('T')[0]}</lastmod>` : ''}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
    <xhtml:link rel="alternate" hreflang="da" href="${SITE_URL}${e.loc}?lang=da" />
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}${e.loc}?lang=en" />
    <xhtml:link rel="alternate" hreflang="sv" href="${SITE_URL}${e.loc}?lang=se" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${e.loc}" />
  </url>`).join('\n')}
</urlset>`

  const outPath = resolve(__dirname, '../public/sitemap.xml')
  writeFileSync(outPath, xml, 'utf-8')
  console.log(`Sitemap generated: ${outPath} (${entries.length} URLs)`)
}

generateSitemap().catch(console.error)
