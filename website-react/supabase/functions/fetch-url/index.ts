/**
 * Supabase Edge Function: fetch-url
 * Fetches a URL and extracts readable article text content.
 * Specifically optimized for research articles (PubMed/PMC) and blog posts.
 * Aggressively removes noise (navigation, references, repeated author info, etc.)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "url" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch the page
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShiftingSource/1.0; +https://shiftingsource.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5,da;q=0.3',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${response.status} ${response.statusText}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const html = await response.text()

    // Parse HTML and extract text
    const doc = new DOMParser().parseFromString(html, 'text/html')
    if (!doc) {
      return new Response(
        JSON.stringify({ error: 'Failed to parse HTML' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove non-content elements aggressively
    const tagsToRemove = [
      'script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'iframe',
      'form', 'button', 'input', 'select', 'textarea',
    ]
    for (const tag of tagsToRemove) {
      const elements = doc.querySelectorAll(tag)
      for (const el of elements) {
        el.remove()
      }
    }

    // Remove PMC/PubMed-specific noise elements
    const noiseSelectors = [
      '.ref-list',           // Reference list
      '.references',         // Reference list
      '#references',         // Reference list
      '.back',               // Back matter (acknowledgements, references, etc.)
      '.supplementary-material', // Supplementary files
      '.sup-material',
      '.fn-group',           // Footnotes
      '.ack',                // Acknowledgements
      '.conflict',           // Conflict of interest
      '.author-notes',       // Author notes
      '.contrib-group',      // Author list (repeated)
      '.aff',                // Affiliations (repeated)
      '[class*="sidebar"]',
      '[class*="toolbar"]',
      '[class*="breadcrumb"]',
      '[class*="pagination"]',
      '[class*="cookie"]',
      '[class*="banner"]',
      '[class*="share"]',
      '[class*="social"]',
      '[class*="related"]',
      '[class*="recommend"]',
      '[id*="sidebar"]',
      '[id*="toolbar"]',
      '[id*="breadcrumb"]',
    ]
    for (const selector of noiseSelectors) {
      try {
        const elements = doc.querySelectorAll(selector)
        for (const el of elements) {
          el.remove()
        }
      } catch { /* ignore invalid selectors */ }
    }

    // Try to find the main article content — prioritize specific selectors
    let textContent = ''

    // PMC-specific selectors (most articles)
    const pmcSelectors = [
      '.jig-ncbiinpagenav',   // PMC main content
      '#mc',                   // PMC main content
      '.article',              // PMC article body
      '.body',                 // Article body
    ]

    // Generic article selectors
    const genericSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '#content',
      '.content',
    ]

    const allSelectors = [...pmcSelectors, ...genericSelectors]

    for (const selector of allSelectors) {
      try {
        const el = doc.querySelector(selector)
        if (el && el.textContent && el.textContent.trim().length > 500) {
          textContent = el.textContent
          break
        }
      } catch { /* ignore */ }
    }

    // Fall back to body text
    if (!textContent) {
      textContent = doc.body?.textContent || ''
    }

    // Clean up the text
    let cleaned = textContent
      .replace(/\t/g, ' ')                    // tabs to spaces
      .replace(/[ ]{2,}/g, ' ')               // collapse multiple spaces
      .replace(/\n[ ]+/g, '\n')               // remove leading spaces on lines
      .replace(/\n{3,}/g, '\n\n')             // max 2 newlines
      .trim()

    // Remove common noise patterns from research articles
    cleaned = cleaned
      .replace(/Find articles by .+?(?=\n|$)/g, '')     // "Find articles by Author Name"
      .replace(/\d+Department of .+?(?=\n|$)/g, '')      // Repeated dept affiliations
      .replace(/Go to:/g, '')                              // Navigation text
      .replace(/Open in a new tab/g, '')
      .replace(/External link/g, '')
      .replace(/PMC full text:/g, '')
      .replace(/\[PMC free article\]/g, '')
      .replace(/\[PubMed\]/g, '')
      .replace(/\[CrossRef\]/g, '')
      .replace(/\[Google Scholar\]/g, '')
      .replace(/doi: \S+/g, (m) => m.length > 60 ? '' : m) // keep short DOIs, remove garbage

    // Final cleanup
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ ]{2,}/g, ' ')
      .trim()

    // Get page title
    const title = doc.querySelector('title')?.textContent?.trim() || ''

    // Get meta description
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''

    return new Response(
      JSON.stringify({
        title,
        description: metaDesc,
        text: cleaned.slice(0, 60000), // 60k chars max
        url: parsedUrl.toString(),
        textLength: cleaned.length,
        cleanedLength: cleaned.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[fetch-url] Error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
