/**
 * OpenAI integration for AI-powered article generation.
 * Settings (API key + model) are stored in Supabase admin_settings table.
 */

import { supabase } from './supabase'

export interface AiSettings {
  openai_api_key: string
  ai_model: string
  kieai_api_key: string
  sftp_host: string
  sftp_port: string
  sftp_username: string
  sftp_password: string
  chat_system_prompt_da: string
  chat_system_prompt_en: string
  chat_system_prompt_se: string
  [key: string]: string
}

const AVAILABLE_MODELS = [
  { id: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Instant', desc: 'Latest flagship — fast, best for articles' },
  { id: 'gpt-5.2', label: 'GPT-5.2 Thinking', desc: 'Best quality — slow (uses reasoning)' },
  { id: 'gpt-5.1', label: 'GPT-5.1', desc: 'Fast, warm, good all-round' },
  { id: 'gpt-5', label: 'GPT-5', desc: 'Original GPT-5' },
  { id: 'gpt-4.1', label: 'GPT-4.1', desc: 'Previous gen — fast and cheap' },
  { id: 'o4-mini', label: 'o4-mini', desc: 'Fast reasoning model' },
]

export { AVAILABLE_MODELS }

/** Default article generation system prompt — used when admin_settings.article_system_prompt is empty */
export const DEFAULT_ARTICLE_PROMPT = `You are a professional health & nutrition writer for "Shifting Source", a science-backed keto & fasting lifestyle platform. Your audience is health-conscious adults in Scandinavia.

CRITICAL: Base your article ONLY on the SOURCE CONTENT provided below. Do NOT invent findings, statistics, or claims. If the source doesn't mention a topic, don't include it. Accuracy is more important than length.

WRITING STYLE:
- Evidence-based, strictly referencing the provided source material
- Warm, accessible tone — not overly academic
- Use subheadings (h2, h3) to break up content
- Include practical takeaways readers can use
- Mention specific numbers/results from the source when available
- Article length per language: 800–1500 words

OUTPUT FORMAT: Return a single JSON object. No markdown code fences, no backticks — just raw JSON.

{
  "title": { "da": "...", "en": "...", "se": "..." },
  "summary": { "da": "1-2 sentence teaser", "en": "...", "se": "..." },
  "content": { "da": "<h2>Heading</h2><p>Paragraph...</p>...", "en": "<h2>Heading</h2><p>Paragraph...</p>...", "se": "<h2>Heading</h2><p>Paragraph...</p>..." },
  "slug": "url-friendly-slug-from-danish-title",
  "categories": ["keto", "metabolic_health"],
  "tags": ["tag1", "tag2", "tag3"],
  "source_title": "Short name of the source",
  "seo_title": { "da": "...", "en": "...", "se": "..." },
  "seo_description": { "da": "...", "en": "...", "se": "..." }
}

IMPORTANT — "content" FIELD:
- Each language's "content" MUST be a substantial, well-structured article (800–1500 words)
- It MUST contain multiple <h2> sections, each with several <p> paragraphs
- Use HTML tags: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>
- Summarize the study's background, methods, key findings, and practical implications
- Do NOT leave "content" empty or short — this is the main article body that readers will see

OTHER RULES:
- "slug": derived from Danish title, lowercase, hyphens, no special chars (æ→ae, ø→oe, å→aa)
- "categories": Pick 1-3 from: "keto", "fasting", "metabolic_health", "gut_biome", "sleep_recovery", "hormones", "mental_health", "inflammation", "exercise_movement", "longevity", "womens_health". Choose the most relevant categories for the article content.
- "tags": 3-5 relevant English lowercase tags
- "seo_title": optimized for search (50-60 chars)
- "seo_description": 120-155 chars
- Write each language NATIVELY — do NOT just translate word-for-word. Each version should read naturally.
- Languages: Danish (da), English (en), Swedish (se)
- NEVER start the article with a link to the source. Source links are displayed separately at the bottom of the page by the website.
- NEVER use time-sensitive words like "new", "ny", "recent", "just published", "newly released", "denne uge", "i dag" etc. The article should be evergreen and read naturally years after publication.
- Do NOT reference the source study/article in the opening line (e.g. "A new study published in..."). Instead, lead with the topic or finding itself.`

/** Fetch all admin settings from Supabase */
export async function getSettings(): Promise<AiSettings> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value')

  if (error) {
    console.error('[Settings] Fetch error:', error)
    return { openai_api_key: '', ai_model: 'gpt-4.1', kieai_api_key: '', sftp_host: '', sftp_port: '22', sftp_username: '', sftp_password: '', chat_system_prompt_da: '', chat_system_prompt_en: '', chat_system_prompt_se: '' }
  }

  const map: Record<string, string> = {}
  for (const row of data || []) {
    map[row.key] = row.value
  }

  return {
    openai_api_key: map['openai_api_key'] || '',
    ai_model: map['ai_model'] || 'gpt-5.2-chat-latest',
    kieai_api_key: map['kieai_api_key'] || '',
    sftp_host: map['sftp_host'] || '',
    sftp_port: map['sftp_port'] || '22',
    sftp_username: map['sftp_username'] || '',
    sftp_password: map['sftp_password'] || '',
    chat_system_prompt_da: map['chat_system_prompt_da'] || '',
    chat_system_prompt_en: map['chat_system_prompt_en'] || '',
    chat_system_prompt_se: map['chat_system_prompt_se'] || '',
    ...map,
  }
}

/** Save a single setting to Supabase */
export async function saveSetting(key: string, value: string, userId?: string) {
  const { data, error, status } = await supabase
    .from('admin_settings')
    .upsert(
      { key, value, updated_at: new Date().toISOString(), updated_by: userId || null },
      { onConflict: 'key' }
    )
    .select('key, value')

  if (error) {
    console.error(`[Settings] Save error for "${key}":`, error)
    throw new Error(`Kunne ikke gemme "${key}": ${error.message}`)
  }

  // RLS can silently block writes — verify data was actually saved
  if (!data || data.length === 0) {
    console.error(`[Settings] Save for "${key}" returned no data (status ${status}). RLS may be blocking writes.`)
    throw new Error(`Kunne ikke gemme "${key}": Ingen data returneret. Din session kan være udløbet — prøv at logge ind igen.`)
  }

  // Verify the saved value matches what we sent
  if (data[0]?.value !== value) {
    console.warn(`[Settings] Value mismatch for "${key}": sent "${value.substring(0, 10)}...", got "${data[0]?.value?.substring(0, 10)}..."`)
  }
}

/** Fetch and extract text content from a URL via Supabase Edge Function */
export async function fetchUrlContent(url: string): Promise<{
  title: string
  description: string
  text: string
  textLength: number
}> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl) throw new Error('Supabase URL not configured')

  const response = await fetch(`${supabaseUrl}/functions/v1/fetch-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error || `Failed to fetch URL: ${response.status}`)
  }

  return response.json()
}

interface GeneratedArticle {
  title: { da: string; en: string; se: string }
  summary: { da: string; en: string; se: string }
  content: { da: string; en: string; se: string }
  slug: string
  categories: string[]
  tags: string[]
  source_title: string
  seo_title: { da: string; en: string; se: string }
  seo_description: { da: string; en: string; se: string }
}

export async function generateArticle(
  sourceUrl: string,
  sourceText: string,
  extraInstructions?: string
): Promise<GeneratedArticle> {
  const settings = await getSettings()

  if (!settings.openai_api_key) {
    throw new Error('OpenAI API key not configured. Go to Admin → Settings to add it.')
  }

  if (!sourceText || sourceText.trim().length < 50) {
    throw new Error('Please paste the source text (abstract, key findings, or article content). The AI cannot read URLs — it needs the actual text to write an accurate article.')
  }

  const model = settings.ai_model || 'gpt-5.2-chat-latest'

  // Smart trim: keep first 15k + last 15k chars to preserve intro AND conclusions
  let trimmedText = sourceText
  if (sourceText.length > 30000) {
    const first = sourceText.slice(0, 15000)
    const last = sourceText.slice(-15000)
    trimmedText = first + '\n\n[... middle section omitted for brevity ...]\n\n' + last
    console.log(`[AI] Source text trimmed: ${sourceText.length} → ${trimmedText.length} chars`)
  }

  console.log(`[AI] Using model: ${model}`)
  console.log(`[AI] Source text length: ${trimmedText.length} chars`)
  const startTime = Date.now()

  // Use custom prompt from admin_settings if available, otherwise use default
  const systemPrompt = settings.article_system_prompt || DEFAULT_ARTICLE_PROMPT

  const userPrompt = `Generate a full article based on this source:

SOURCE URL: ${sourceUrl}

SOURCE CONTENT:
${trimmedText}

${extraInstructions ? `ADDITIONAL INSTRUCTIONS: ${extraInstructions}` : ''}

Return ONLY the JSON object, no other text.`

  console.log(`[AI] Request body size: ~${Math.round((systemPrompt.length + userPrompt.length) / 1000)}k chars`)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openai_api_key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: 16000,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      err?.error?.message || `OpenAI API error: ${response.status}`
    )
  }

  const data = await response.json()
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`[AI] Response received in ${elapsed}s`)
  console.log(`[AI] Usage:`, data.usage)

  const text = data.choices?.[0]?.message?.content?.trim()

  if (!text) throw new Error('Empty response from OpenAI')

  const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '')

  try {
    const article: GeneratedArticle = JSON.parse(jsonStr)

    if (!article.title?.da || !article.content?.da) {
      throw new Error('Missing required fields in generated article')
    }

    return article
  } catch (e: any) {
    console.error('[OpenAI] Failed to parse response:', text)
    throw new Error(`Failed to parse AI response: ${e.message}`)
  }
}
