/**
 * Kie.ai Nanobanana Pro integration for AI image generation.
 * Uses Gemini 3.0 Pro via Kie.ai's API.
 *
 * Flow:
 * 1. generateImagePrompt() - uses OpenAI to create a visual prompt from article content
 * 2. generateImage() - sends prompt to proxy-kieai Edge Function, polls for result, returns image URL
 *
 * All Kie.ai API calls are proxied through a Supabase Edge Function (proxy-kieai)
 * to avoid CORS issues and keep the API key secure.
 */

import { getSettings } from './openai'
import { supabase } from './supabase'

// -- Constants --

const POLL_INTERVAL_MS = 2500
const MAX_POLL_ATTEMPTS = 30 // 30 x 2.5s = 75s max
const FETCH_TIMEOUT_MS = 15000 // 15s timeout for individual API calls

// -- Types --

interface TaskResult {
  resultUrls?: string[]
  [key: string]: unknown
}

// -- Helpers --

/** Fetch with timeout - prevents hanging requests */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Forespørgsel timeout efter ${Math.round(timeoutMs / 1000)} sekunder. Tjek din internetforbindelse og prøv igen.`)
    }
    // Provide helpful error for CORS/network issues
    if (err.message === 'Failed to fetch' || err.message?.includes('NetworkError')) {
      throw new Error('Netværksfejl — kunne ikke oprette forbindelse til serveren. Dette kan skyldes CORS-blokering eller manglende internetforbindelse.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Get the Supabase Edge Function base URL and auth headers */
function getProxyConfig() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase konfiguration mangler. Tjek VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i .env')
  }

  return {
    proxyUrl: `${supabaseUrl}/functions/v1/proxy-kieai`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
  }
}

/** Get auth token from current session for proxy authentication */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) {
    throw new Error('Du skal være logget ind som admin for at generere billeder.')
  }

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

// -- Image Prompt Generation (via OpenAI) --

/** Default image prompt for recipes — used when admin_settings.image_prompt_recipe is empty */
export const DEFAULT_IMAGE_PROMPT_RECIPE = `You are a professional food photography director. Based on the recipe content provided, create a detailed image prompt for AI image generation.

CRITICAL — CULTURAL CONTEXT PRIORITY:
The "Categories / Tags" field is THE most important signal for the cultural setting and styling.
If a tag says "Fransk" or "French" — the image MUST have a French aesthetic.
If a tag says "Italiensk" or "Italian" — the image MUST have an Italian aesthetic.
Tags override any assumptions you might make from the dish name or ingredients alone.

CULTURAL STYLING GUIDE:
  - French (Fransk) — marble or zinc bistro table, linen napkin, rustic baguette nearby, soft Parisian window light, muted tones, elegant but effortless plating, wine glass or carafe in background
  - Italian (Italiensk) — rustic olive-wood table, terracotta tiles, warm golden light, fresh herbs, Mediterranean feel
  - Danish / Nordic summer — bright white garden table, green surroundings, natural daylight, wildflowers
  - Nordic winter / Heavy Nordic — dark wooden table, candlelight, cozy hygge atmosphere, wool textures
  - Asian (Asiatisk) — minimalist setting, bamboo elements, black/white contrast, clean lines
  - Mexican (Mexicansk) — colorful tiles, terracotta, bright natural light, lime wedges, cilantro sprigs
  - Middle Eastern (Mellemøstlig) — ornate brass tray, warm spice tones, pomegranate seeds, rustic stone surface
  - General keto — clean modern kitchen, marble countertop, fresh colorful ingredients, bright light

COMPOSITION — TEXT OVERLAY ZONE:
The LEFT ~40% of the image will have a title/text overlay on the website's full-size view.
Therefore: place the main subject (the dish) in the CENTER or RIGHT side of the frame.
The LEFT side should be kept relatively simple — soft background, blurred elements, dark/moody tones, or empty surface — so white text remains readable on top of it.
Think of it like a magazine layout: the hero food is right-of-center, and the left has breathing room for a headline.

RULES:
- Describe a realistic, beautiful food photograph — NOT text, graphics, or illustrations
- Focus on the dish itself — plating, garnish, steam, textures, surrounding ingredients
- Include: lighting style, table/surface material, background, food styling, color palette
- The prompt MUST be in English
- Maximum 200 words
- NEVER mention text, logos, watermarks, or human faces/hands
- Make it look like a professional food magazine photograph

Return ONLY the image prompt text, nothing else.`

/** Default image prompt for articles — used when admin_settings.image_prompt_article is empty */
export const DEFAULT_IMAGE_PROMPT_ARTICLE = `You are an editorial art director for a premium health & science magazine. Based on the article content provided, create a detailed image prompt for AI image generation.

The website covers: keto diets, fasting (intermittent fasting, prolonged fasting), metabolic health, weight loss research, and longevity science.

ARTICLE IMAGE PHILOSOPHY:
Articles are NOT recipes. They are about research, studies, guides, science, and lifestyle concepts.
The image should be CONCEPTUAL and EDITORIAL — like a striking magazine cover or feature article hero image.
Think editorial photography, conceptual still life, or atmospheric mood shots — NOT food plating on a table.

STYLE APPROACHES (choose the best fit based on the article topic):

For RESEARCH / STUDY articles (comparisons, clinical trials, meta-analyses):
  - Abstract conceptual imagery: e.g. two contrasting paths, a fork in the road, symbolic objects representing the study's comparison
  - Scientific editorial: laboratory glassware with colorful liquids, petri dishes with food elements, a scale balancing different foods
  - Data-inspired: geometric patterns, flowing organic shapes suggesting graphs or trends, clean minimalist compositions

For FASTING articles:
  - Empty plate on a beautiful surface with dramatic lighting, a single glass of water, an hourglass, sunrise through a window with an empty kitchen
  - Time-focused: clock elements, transitions from dark to light, dawn/dusk atmosphere
  - Minimalism and negative space — the emptiness IS the subject

For KETO / LOW-CARB LIFESTYLE articles:
  - Abundance of healthy fats: avocados, olive oil, nuts — but shot as an artistic arrangement, almost abstract
  - Macro close-ups: the texture of an avocado half, oil droplets, cross-section of a nut
  - Lifestyle mood: morning coffee with butter, a calm kitchen scene at golden hour

For WEIGHT LOSS / BODY COMPOSITION articles:
  - Symbolic: a measuring tape loosely coiled, a before/after concept with light, transformation imagery
  - Movement and energy: blurred motion, dynamic lighting, sense of progress
  - Nature and renewal: fresh morning light, open spaces, sense of freedom

For LONGEVITY / HEALTH SCIENCE:
  - Timeless imagery: hourglasses, sundials, tree rings, flowing water
  - Vitality: vibrant colors, fresh natural elements, sense of energy and youth
  - Lab-meets-nature: scientific elements alongside organic, natural materials

COMPOSITION — TEXT OVERLAY ZONE:
The LEFT ~40% of the image will have a title/text overlay on the website's full-size view.
Therefore: place the main focal point in the CENTER or RIGHT side of the frame.
The LEFT side should be kept subdued — darker tones, soft gradients, out-of-focus areas, negative space, or simple textures — so white text remains readable on top of it.
Think of it like a magazine spread: the visual impact is right-of-center, and the left provides a calm backdrop for the headline.

RULES:
- NEVER make it look like a recipe photo with food plated on a table
- Think magazine editorial, conceptual art, or atmospheric photography
- Use dramatic or intentional lighting (not just "bright kitchen light")
- Embrace negative space, unusual angles, macro photography, or abstract composition
- The prompt MUST be in English
- Maximum 200 words
- NEVER mention text, logos, watermarks, or human faces/hands/bodies
- NEVER describe specific food dishes being served or plated

Return ONLY the image prompt text, nothing else.`

/**
 * Uses OpenAI to generate a visual image prompt based on article/recipe content.
 */
export async function generateImagePrompt(
  contentType: 'article' | 'recipe',
  title: string,
  content: string,
  categories: string[] = [],
): Promise<string> {
  const settings = await getSettings()

  if (!settings.openai_api_key) {
    throw new Error('OpenAI API key mangler. Gå til Admin → Indstillinger for at tilføje den.')
  }

  // Strip HTML tags for cleaner input
  const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const trimmed = plainContent.length > 3000 ? plainContent.slice(0, 3000) + '...' : plainContent

  const userPrompt = `Content type: ${contentType}
Title: ${title}
${categories.length > 0 ? `Categories / Tags (IMPORTANT — use these to determine the cultural setting): ${categories.join(', ')}` : ''}

Content:
${trimmed}

Generate a detailed image prompt for this ${contentType === 'recipe' ? 'recipe' : 'article'}. Pay special attention to the categories/tags for the correct cultural context and styling.`

  const model = settings.ai_model || 'gpt-5.2-chat-latest'

  console.log(`[KieAI] Generating image prompt via OpenAI (${model})...`)

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openai_api_key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: contentType === 'recipe'
          ? (settings.image_prompt_recipe || DEFAULT_IMAGE_PROMPT_RECIPE)
          : (settings.image_prompt_article || DEFAULT_IMAGE_PROMPT_ARTICLE) },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: 500,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI API fejl: ${response.status}`)
  }

  const data = await response.json()
  const prompt = data.choices?.[0]?.message?.content?.trim()

  if (!prompt) throw new Error('Tom respons fra OpenAI')

  console.log(`[KieAI] Image prompt generated (${prompt.length} chars)`)
  return prompt
}

// -- Image Generation (via proxy-kieai Edge Function) --

/**
 * Generates an image via the proxy-kieai Edge Function.
 * The Edge Function handles Kie.ai API calls server-side (no CORS issues).
 * Returns the URL of the generated image.
 */
export async function generateImage(
  prompt: string,
  aspectRatio: '16:9' | '4:3' = '16:9',
): Promise<string> {
  const { proxyUrl } = getProxyConfig()
  const headers = await getAuthHeaders()

  console.log(`[KieAI] Creating image task via proxy (aspect: ${aspectRatio})...`)

  // 1. Create task via proxy
  const createResponse = await fetchWithTimeout(proxyUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'createTask',
      prompt,
      aspectRatio,
    }),
  })

  const createData = await createResponse.json()

  if (!createResponse.ok) {
    const errorMsg = createData?.error || `Billedgenerering fejlede (${createResponse.status})`
    console.error(`[KieAI] createTask failed:`, createData)

    // Provide helpful messages for common errors
    if (createResponse.status === 401) {
      throw new Error('Ikke autoriseret. Tjek at du er logget ind som admin og at Kie.ai API key er korrekt konfigureret i Admin → Indstillinger.')
    }
    if (createData?.code === 'KIEAI_CREATE_FAILED') {
      throw new Error(`Kie.ai kunne ikke oprette opgaven: ${errorMsg}. Tjek at din API key er gyldig.`)
    }
    throw new Error(errorMsg)
  }

  const taskId = createData.taskId
  if (!taskId) {
    console.error('[KieAI] No taskId in proxy response:', createData)
    throw new Error('Intet task ID modtaget fra billedgenereringstjenesten.')
  }

  console.log(`[KieAI] Task created: ${taskId}`)

  // 2. Poll for result via proxy
  return pollForResult(taskId, proxyUrl, headers)
}

/**
 * Polls the proxy-kieai Edge Function for task completion.
 * Returns the image URL when ready.
 */
async function pollForResult(
  taskId: string,
  proxyUrl: string,
  headers: Record<string, string>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS)

    let pollData: any
    try {
      const response = await fetchWithTimeout(proxyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'recordInfo',
          taskId,
        }),
      }, 10000) // 10s timeout for polls

      pollData = await response.json()

      if (!response.ok) {
        console.warn(`[KieAI] Poll ${attempt + 1} failed: ${pollData?.error || response.status}`)
        continue
      }
    } catch (err: any) {
      console.warn(`[KieAI] Poll ${attempt + 1} network error:`, err.message)
      continue
    }

    const state = pollData?.state
    console.log(`[KieAI] Poll ${attempt + 1}/${MAX_POLL_ATTEMPTS}: state=${state}`)

    if (state === 'success') {
      const resultJson = pollData.resultJson
      if (!resultJson) throw new Error('Tomt resultat fra billedgenerering')

      let result: TaskResult
      try {
        result = JSON.parse(resultJson)
      } catch {
        throw new Error('Kunne ikke læse billedgenereringsresultatet')
      }

      const imageUrl = result.resultUrls?.[0]
      if (!imageUrl) throw new Error('Ingen billed-URL i resultatet')

      console.log(`[KieAI] Image generated successfully`)
      return imageUrl
    }

    if (state === 'failed') {
      const failMsg = pollData.failMsg || 'Ukendt fejl'
      throw new Error(`Billedgenerering fejlede: ${failMsg}`)
    }

    // 'waiting', 'pending', or 'processing' - continue polling
  }

  throw new Error('Timeout: Billedgenerering tog for lang tid (>75 sekunder). Prøv igen — serveren kan være overbelastet.')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
