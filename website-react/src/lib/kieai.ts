/**
 * Kie.ai Nanobanana Pro integration for AI image generation.
 * Uses Gemini 3.0 Pro via Kie.ai's API.
 *
 * Flow:
 * 1. generateImagePrompt() — uses OpenAI to create a visual prompt from article content
 * 2. generateImage() — sends prompt to Kie.ai, polls for result, returns image URL
 */

import { getSettings } from './openai'

// ── Constants ────────────────────────────────────────────────────────

const KIEAI_BASE = 'https://api.kie.ai/api/v1/jobs'
const CREATE_TASK_URL = `${KIEAI_BASE}/createTask`
const RECORD_INFO_URL = `${KIEAI_BASE}/recordInfo`

const POLL_INTERVAL_MS = 2500
const MAX_POLL_ATTEMPTS = 30 // 30 × 2.5s = 75s max

// ── Types ────────────────────────────────────────────────────────────


interface RecordInfoResponse {
  code: number
  msg: string
  data: {
    taskId: string
    state: 'waiting' | 'pending' | 'processing' | 'success' | 'failed'
    resultJson?: string
    failMsg?: string
  }
}

interface TaskResult {
  resultUrls?: string[]
  [key: string]: unknown
}

// ── Image Prompt Generation (via OpenAI) ─────────────────────────────

const IMAGE_PROMPT_SYSTEM_RECIPE = `You are a professional food photography director. Based on the recipe content provided, create a detailed image prompt for AI image generation.

CRITICAL — CULTURAL CONTEXT PRIORITY:
The "Categories / Tags" field is THE most important signal for the cultural setting and styling.
If a tag says "Fransk" or "French" → the image MUST have a French aesthetic.
If a tag says "Italiensk" or "Italian" → the image MUST have an Italian aesthetic.
Tags override any assumptions you might make from the dish name or ingredients alone.

CULTURAL STYLING GUIDE:
  • French (Fransk) → marble or zinc bistro table, linen napkin, rustic baguette nearby, soft Parisian window light, muted tones, elegant but effortless plating, wine glass or carafe in background
  • Italian (Italiensk) → rustic olive-wood table, terracotta tiles, warm golden light, fresh herbs, Mediterranean feel
  • Danish / Nordic summer → bright white garden table, green surroundings, natural daylight, wildflowers
  • Nordic winter / Heavy Nordic → dark wooden table, candlelight, cozy hygge atmosphere, wool textures
  • Asian (Asiatisk) → minimalist setting, bamboo elements, black/white contrast, clean lines
  • Mexican (Mexicansk) → colorful tiles, terracotta, bright natural light, lime wedges, cilantro sprigs
  • Middle Eastern (Mellemøstlig) → ornate brass tray, warm spice tones, pomegranate seeds, rustic stone surface
  • General keto → clean modern kitchen, marble countertop, fresh colorful ingredients, bright light

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

const IMAGE_PROMPT_SYSTEM_ARTICLE = `You are an editorial art director for a premium health & science magazine. Based on the article content provided, create a detailed image prompt for AI image generation.

The website covers: keto diets, fasting (intermittent fasting, prolonged fasting), metabolic health, weight loss research, and longevity science.

ARTICLE IMAGE PHILOSOPHY:
Articles are NOT recipes. They are about research, studies, guides, science, and lifestyle concepts.
The image should be CONCEPTUAL and EDITORIAL — like a striking magazine cover or feature article hero image.
Think editorial photography, conceptual still life, or atmospheric mood shots — NOT food plating on a table.

STYLE APPROACHES (choose the best fit based on the article topic):

For RESEARCH / STUDY articles (comparisons, clinical trials, meta-analyses):
  → Abstract conceptual imagery: e.g. two contrasting paths, a fork in the road, symbolic objects representing the study's comparison
  → Scientific editorial: laboratory glassware with colorful liquids, petri dishes with food elements, a scale balancing different foods
  → Data-inspired: geometric patterns, flowing organic shapes suggesting graphs or trends, clean minimalist compositions

For FASTING articles:
  → Empty plate on a beautiful surface with dramatic lighting, a single glass of water, an hourglass, sunrise through a window with an empty kitchen
  → Time-focused: clock elements, transitions from dark to light, dawn/dusk atmosphere
  → Minimalism and negative space — the emptiness IS the subject

For KETO / LOW-CARB LIFESTYLE articles:
  → Abundance of healthy fats: avocados, olive oil, nuts — but shot as an artistic arrangement, almost abstract
  → Macro close-ups: the texture of an avocado half, oil droplets, cross-section of a nut
  → Lifestyle mood: morning coffee with butter, a calm kitchen scene at golden hour

For WEIGHT LOSS / BODY COMPOSITION articles:
  → Symbolic: a measuring tape loosely coiled, a before/after concept with light, transformation imagery
  → Movement and energy: blurred motion, dynamic lighting, sense of progress
  → Nature and renewal: fresh morning light, open spaces, sense of freedom

For LONGEVITY / HEALTH SCIENCE:
  → Timeless imagery: hourglasses, sundials, tree rings, flowing water
  → Vitality: vibrant colors, fresh natural elements, sense of energy and youth
  → Lab-meets-nature: scientific elements alongside organic, natural materials

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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.openai_api_key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: contentType === 'recipe' ? IMAGE_PROMPT_SYSTEM_RECIPE : IMAGE_PROMPT_SYSTEM_ARTICLE },
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

// ── Image Generation (via Kie.ai) ───────────────────────────────────

/**
 * Generates an image via Kie.ai Nanobanana Pro API.
 * Returns the URL of the generated image.
 */
export async function generateImage(
  prompt: string,
  aspectRatio: '16:9' | '4:3' = '16:9',
): Promise<string> {
  const settings = await getSettings()

  if (!settings.kieai_api_key) {
    throw new Error('Kie.ai API key mangler. Gå til Admin → Indstillinger for at tilføje den.')
  }

  console.log(`[KieAI] Creating image task (aspect: ${aspectRatio})...`)

  // 1. Create task
  const createResponse = await fetch(CREATE_TASK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.kieai_api_key}`,
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        resolution: '1K',
        output_format: 'png',
      },
    }),
  })

  if (!createResponse.ok) {
    const errBody = await createResponse.text().catch(() => '(no body)')
    console.error(`[KieAI] createTask failed: ${createResponse.status}`, errBody)
    try {
      const errJson = JSON.parse(errBody)
      throw new Error(errJson?.msg || errJson?.message || errJson?.error || `Kie.ai API fejl: ${createResponse.status}`)
    } catch (e: any) {
      if (e.message.includes('Kie.ai')) throw e
      throw new Error(`Kie.ai API fejl: ${createResponse.status} — ${errBody.slice(0, 200)}`)
    }
  }

  const createText = await createResponse.text()
  console.log(`[KieAI] createTask raw response:`, createText)

  let createData: any
  try {
    createData = JSON.parse(createText)
  } catch {
    throw new Error(`Kie.ai returnerede ugyldigt JSON: ${createText.slice(0, 200)}`)
  }

  // Try multiple response formats — the API structure may differ
  const taskId = createData.data?.taskId || createData.taskId || createData.data?.task_id || createData.task_id
  if (!taskId) {
    console.error('[KieAI] Unexpected response structure:', JSON.stringify(createData, null, 2))
    throw new Error(`Intet task ID i Kie.ai respons. Struktur: ${JSON.stringify(Object.keys(createData))}`)
  }

  console.log(`[KieAI] Task created: ${taskId}`)

  // 2. Poll for result
  return pollForResult(taskId, settings.kieai_api_key)
}

/**
 * Polls Kie.ai for task completion. Returns the image URL when ready.
 */
async function pollForResult(taskId: string, apiKey: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS)

    const url = `${RECORD_INFO_URL}?taskId=${encodeURIComponent(taskId)}`
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      console.warn(`[KieAI] Poll attempt ${attempt + 1} failed: ${response.status}`)
      continue
    }

    const data: RecordInfoResponse = await response.json()
    const state = data.data?.state

    console.log(`[KieAI] Poll ${attempt + 1}/${MAX_POLL_ATTEMPTS}: state=${state}`)

    if (state === 'success') {
      const resultJson = data.data.resultJson
      if (!resultJson) throw new Error('Tomt resultat fra Kie.ai')

      let result: TaskResult
      try {
        result = JSON.parse(resultJson)
      } catch {
        // resultJson might already be the URL or a different format
        throw new Error('Kunne ikke parse Kie.ai resultat')
      }

      const imageUrl = result.resultUrls?.[0]
      if (!imageUrl) throw new Error('Ingen billed-URL i Kie.ai resultat')

      console.log(`[KieAI] Image generated successfully`)
      return imageUrl
    }

    if (state === 'failed') {
      throw new Error(`Billedgenerering fejlede: ${data.data.failMsg || 'Ukendt fejl'}`)
    }

    // 'waiting', 'pending', or 'processing' — continue polling
  }

  throw new Error('Timeout: Billedgenerering tog for lang tid (>75 sek)')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
