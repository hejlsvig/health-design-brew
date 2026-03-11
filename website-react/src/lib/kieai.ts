/**
 * Kie.ai Nanobanana Pro integration for AI image & video generation.
 * Uses Gemini 3.0 Pro via Kie.ai's API.
 *
 * Flow (images):
 * 1. generateImagePrompt() - uses OpenAI to create a visual prompt from article/recipe content
 * 2. generateImage() - sends prompt to proxy-kieai Edge Function, polls for result, returns image URL
 *
 * Flow (videos — prepared, not yet active):
 * 1. generateVideoPrompt() - uses OpenAI to create a video script from article/recipe content
 * 2. generateVideo() - TODO: connect AI video generator when provider is chosen
 *
 * All prompts are configurable via admin_settings:
 *   image_prompt_article, image_prompt_recipe, video_prompt_article, video_prompt_recipe
 *
 * Style variations are automatically injected for visual diversity.
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

// -- Variation system for diverse image generation --

/** Style variations injected into prompts to ensure diverse, non-repetitive images */
const ARTICLE_STYLE_VARIATIONS = [
  'EXPLODING INGREDIENTS — a dynamic explosion of colorful ingredients flying outward from center. Avocados, nuts, berries, oils, herbs caught mid-air in a dramatic burst. High-speed photography feel, vivid colors against a dark or contrasting background. Energy and abundance.',
  'SURREAL FOOD LANDSCAPE — a miniature fantasy world built from foods and natural ingredients. Think tiny trees made of broccoli, rivers of olive oil, mountains of nuts. Tilt-shift perspective, dreamlike, imaginative, richly colored. Makes you stop scrolling.',
  'BOLD COLOR BLOCKS — a striking color-blocked composition. Rich sections of deep green, amber gold, and warm terracotta filled with relevant natural elements. Graphic design meets photography. Strong visual impact, almost poster-like.',
  'DRAMATIC OVERHEAD ABUNDANCE — a rich, overflowing spread shot from directly above. Multiple colorful ingredients, textures, and natural elements filling the entire frame edge-to-edge. Organized chaos. Think National Geographic food photography meets art installation.',
  'CROSS-SECTION REVEAL — dramatic cross-sections of fruits, vegetables, or natural elements revealing their hidden interior beauty. Macro detail, vibrant colors, almost scientific but deeply beautiful. Like seeing nature\'s hidden architecture.',
  'LIQUID ART — dynamic liquid photography with colorful oils, juices, or water in motion. Splashes, drops, swirls of color colliding. High-speed capture, vivid colors, abstract but clearly food/nature-related. Gallery-worthy.',
  'FIRE AND WARMTH — warm flames, glowing embers, candlelight, or golden firelight illuminating ingredients and natural elements. Cozy but dramatic. Rich oranges, deep reds, warm ambers. Primal and inviting.',
  'SEASONAL TAPESTRY — a rich seasonal composition that tells a story. Autumn leaves with spices and warm foods, or summer abundance with bright fruits and herbs. Layered, textured, multiple depths. Like peering into a still life painting.',
  'NEON NATURE — natural ingredients and elements lit with unexpected, vibrant colored lighting (cyan, magenta, amber). Creates a modern, almost futuristic look while keeping organic subjects. Edgy wellness.',
  'SMOKE AND MYSTERY — wisps of steam, smoke, or mist swirling around key ingredients or symbolic objects. Atmospheric, intriguing, cinematic. Dark background with spotlit subjects emerging from the haze.',
  'GEOMETRIC FOOD ART — ingredients meticulously arranged into geometric patterns, gradients, or mandalas. Perfectly organized by color and size. Satisfying, precise, Instagram-worthy. The beauty of order in nature.',
  'DOUBLE EXPOSURE BLEND — a creative double-exposure effect merging a landscape or nature scene with close-up food/ingredient imagery. Two worlds overlapping. Dreamy, artistic, conceptual. Think album cover meets wellness magazine.',
]

const RECIPE_STYLE_VARIATIONS = [
  'Shot from a LOW ANGLE — camera at table level looking slightly up, making the dish heroic and dramatic. Shallow depth of field on the background.',
  'Use MOODY SIDE LIGHTING — dark, atmospheric, a single directional light source from the left. Chiaroscuro effect. Like a Rembrandt painting of food.',
  'BRIGHT OVERHEAD FLAT-LAY — top-down view of the complete spread with all ingredients artfully arranged around the main dish. Clean, organized, Instagram-worthy.',
  'EXTREME CLOSE-UP — macro shot showing the texture and details of the dish. Steam rising, sauce dripping, crust cracking. Trigger the appetite.',
  'RUSTIC IN-PROGRESS — the dish being assembled. Flour-dusted surfaces, a hand (out of frame) holding a utensil, ingredients mid-preparation. Story-telling.',
  'WINDOW LIGHT — natural side light through a large window, casting soft shadows. The dish on a simple wooden table with minimal props. Calm and inviting.',
  'DIAGONAL COMPOSITION — the plate placed at 45 degrees with props flowing from corner to corner. Dynamic and editorial. Magazine cover energy.',
  'ENVIRONMENTAL — pull back to show the full table scene or kitchen corner. The dish in context. Storytelling about the meal, not just the food.',
]

// -- Video style variations --

const ARTICLE_VIDEO_STYLE_VARIATIONS = [
  'WHITEBOARD EXPLAINER — animated hand-drawn diagrams appearing on a white background. Arrows, icons, and simple illustrations build up as the narration progresses. Clean, educational, Khan Academy-inspired.',
  'CINEMATIC B-ROLL MONTAGE — slow-motion clips of relevant imagery (nature, lab scenes, food prep, human movement) with smooth transitions. Ken Burns-effect on still images. Professional documentary feel.',
  'INFOGRAPHIC ANIMATION — data points, charts, and statistics animate in with smooth motion graphics. Numbers count up, bars grow, timelines scroll. Clean modern design with the brand color palette.',
  'MICROSCOPIC JOURNEY — zoom from macro to micro level. Start with everyday objects and zoom into cellular/molecular animations. Scientific but accessible. Think "Powers of Ten" meets wellness.',
  'SPLIT-SCREEN COMPARISON — side-by-side before/after or this-vs-that format. Two scenarios playing simultaneously to illustrate contrasts. Clean dividing line, consistent framing.',
  'STORYTELLING NARRATIVE — follow a day-in-the-life sequence. Morning to evening, showing how the topic integrates into daily routines. Warm, relatable, lifestyle-documentary style.',
  'MINIMAL KINETIC TYPOGRAPHY — key phrases and statistics animate on screen with smooth transitions. Minimal background imagery, letting the words and numbers carry the message. Bold, impactful.',
  'NATURE TIMELAPSE METAPHOR — use nature timelapses (sunrise, plant growth, water flow, seasons changing) as visual metaphors for the health concepts being explained. Meditative and beautiful.',
]

const RECIPE_VIDEO_STYLE_VARIATIONS = [
  'OVERHEAD STOP-MOTION — top-down camera, ingredients appear and arrange themselves as if by magic. Quick, playful cuts. Hands occasionally enter frame. Clean countertop background.',
  'STEP-BY-STEP TUTORIAL — classic cooking show format. Close-ups of each preparation step. Clear, well-lit, professional kitchen setting. Hands visible doing the work.',
  'CINEMATIC FOOD FILM — dramatic slow-motion of key moments: oil sizzling, herbs falling, steam rising, sauce drizzling. Moody lighting, shallow depth of field. Restaurant-quality.',
  'INGREDIENT SPOTLIGHT — each ingredient gets its own hero moment before coming together. Macro shots of textures, colors, freshness. Then a satisfying assembly sequence.',
  'TIMELAPSE TRANSFORMATION — accelerated footage of the full cooking process from raw to plated. Satisfying to watch the dish come together in 30 seconds.',
]

/** Pick a random style variation */
function getStyleVariation(variations: string[]): string {
  const idx = Math.floor(Math.random() * variations.length)
  return variations[idx]
}

// -- Video Prompt Generation (via OpenAI) — ready for future AI video integration --

/** Default video prompt for articles — used when admin_settings.video_prompt_article is empty */
export const DEFAULT_VIDEO_PROMPT_ARTICLE = `You are a video content director for a premium health & wellness platform. Based on the article content provided, create a detailed video script/prompt for AI video generation.

The website covers: keto diets, fasting (intermittent fasting, prolonged fasting), metabolic health, weight loss research, and longevity science.

VIDEO PHILOSOPHY:
This is an EXPLAINER VIDEO — its purpose is to make the article's key concepts accessible and engaging.
The video will be displayed ABOVE the article as a visual introduction. Think of it as a 30-60 second summary that hooks the viewer and encourages them to read the full article.

STRUCTURE:
1. HOOK (0-5 sec): An attention-grabbing visual or statement related to the topic
2. CONTEXT (5-15 sec): Set the scene — what is this about and why does it matter?
3. KEY INSIGHT (15-40 sec): The main finding, concept, or actionable takeaway — visualized clearly
4. CLOSING (40-60 sec): A compelling visual conclusion that motivates reading the full article

LANGUAGE & NARRATION:
- The video will be generated in a specific language (da/en/se) — adapt the narration accordingly
- Keep narration conversational and accessible — avoid overly academic language
- Use rhetorical questions to engage the viewer
- Numbers and statistics should be visualized, not just spoken

VISUAL GUIDELINES:
- Prefer warm, bright, optimistic visuals — aligned with the brand aesthetic
- NO human faces or identifiable people
- Include smooth transitions between scenes
- Data and statistics should appear as animated graphics
- Use natural elements (sunlight, water, plants) as visual metaphors when relevant

RULES:
- The prompt MUST be in English (the AI video tool works in English)
- Maximum 300 words
- Include clear scene-by-scene breakdown with timing
- Describe both visuals AND narration/text for each scene
- NEVER include logos, watermarks, or branding elements
- NEVER show human faces or identifiable people

Return ONLY the video prompt/script, nothing else.`

/** Default video prompt for recipes — used when admin_settings.video_prompt_recipe is empty */
export const DEFAULT_VIDEO_PROMPT_RECIPE = `You are a culinary video director for a premium keto & wellness food platform. Based on the recipe content provided, create a detailed video script/prompt for AI video generation.

VIDEO PHILOSOPHY:
This is a RECIPE EXPLAINER VIDEO — it shows the dish being prepared in an appetizing, easy-to-follow format.
The video will be displayed ABOVE the recipe as a visual guide. Think 30-60 seconds that makes the viewer excited to cook this dish.

KITCHEN SELECTION:
Based on the recipe's cultural origin, tags, and ingredients, choose THE most appropriate kitchen setting:
1. NORDIC KITCHEN — clean lines, light wood, white countertops, natural daylight, minimalist. For: Danish, Swedish, Nordic dishes.
2. MEDITERRANEAN KITCHEN — terracotta tiles, olive wood, warm stone, herbs hanging, golden light. For: Italian, Greek, Spanish, Middle Eastern dishes.
3. FRENCH BISTRO KITCHEN — zinc/marble surfaces, copper pots, linen towels, soft Parisian light. For: French, Belgian, classic European dishes.
4. ASIAN KITCHEN — dark wood, bamboo elements, wok station, clean contrast, focused lighting. For: Japanese, Chinese, Thai, Korean, Vietnamese dishes.
5. MODERN PROFESSIONAL KITCHEN — stainless steel, clean white, professional equipment, bright even lighting. For: general keto, fusion, or unspecified origin dishes.

STRUCTURE:
1. HERO SHOT (0-3 sec): The finished dish in its full glory — appetite trigger
2. INGREDIENTS (3-10 sec): Quick montage of key ingredients appearing/being arranged
3. KEY STEPS (10-45 sec): 3-5 most important preparation steps, each 5-7 seconds
4. PLATING (45-55 sec): The final assembly/plating moment
5. FINAL SHOT (55-60 sec): The completed dish with garnish — beauty shot

RULES:
- The prompt MUST be in English
- Maximum 300 words
- Scene-by-scene breakdown with timing
- Describe camera angles, movements, lighting for each scene
- NO human faces — hands only when preparing food
- Include the cultural kitchen setting in every scene description
- Describe textures, steam, sizzle, drizzle — make it appetizing

Return ONLY the video prompt/script, nothing else.`

/**
 * Uses OpenAI to generate a video prompt based on article/recipe content.
 * Ready for use when an AI video generator is connected.
 */
export async function generateVideoPrompt(
  contentType: 'article' | 'recipe',
  title: string,
  content: string,
  categories: string[] = [],
  language: string = 'da',
): Promise<string> {
  const settings = await getSettings()

  if (!settings.openai_api_key) {
    throw new Error('OpenAI API key mangler. Gå til Admin → Indstillinger for at tilføje den.')
  }

  // Strip HTML tags for cleaner input
  const plainContent = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const trimmed = plainContent.length > 3000 ? plainContent.slice(0, 3000) + '...' : plainContent

  // Pick a random style variation for visual diversity
  const styleVariation = contentType === 'recipe'
    ? getStyleVariation(RECIPE_VIDEO_STYLE_VARIATIONS)
    : getStyleVariation(ARTICLE_VIDEO_STYLE_VARIATIONS)

  const langLabel = language === 'da' ? 'Danish' : language === 'se' ? 'Swedish' : 'English'

  const userPrompt = `Content type: ${contentType}
Title: ${title}
Target language for narration/text: ${langLabel}
${categories.length > 0 ? `Categories / Tags (IMPORTANT — use these to determine cultural context and kitchen setting): ${categories.join(', ')}` : ''}

Content:
${trimmed}

🎬 STYLE DIRECTIVE FOR THIS VIDEO:
${styleVariation}
Apply this specific style directive to your video prompt. It overrides the default style approach for this particular video, ensuring visual variety across the site.

Generate a detailed video script/prompt for this ${contentType === 'recipe' ? 'recipe' : 'article'}. The narration/on-screen text should be appropriate for ${langLabel}-speaking audience.`

  const model = settings.ai_model || 'gpt-5.2-chat-latest'

  console.log(`[KieAI] Generating video prompt via OpenAI (${model}, lang: ${language})...`)

  const systemPrompt = contentType === 'recipe'
    ? (settings.video_prompt_recipe || DEFAULT_VIDEO_PROMPT_RECIPE)
    : (settings.video_prompt_article || DEFAULT_VIDEO_PROMPT_ARTICLE)

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
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
      max_completion_tokens: 800,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `OpenAI API fejl: ${response.status}`)
  }

  const data = await response.json()
  const prompt = data.choices?.[0]?.message?.content?.trim()

  if (!prompt) throw new Error('Tom respons fra OpenAI')

  console.log(`[KieAI] Video prompt generated (${prompt.length} chars)`)
  return prompt
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
export const DEFAULT_IMAGE_PROMPT_ARTICLE = `You are an editorial art director for a premium health & wellness magazine. Based on the article content provided, create a detailed image prompt for AI image generation.

The website covers: keto diets, fasting (intermittent fasting, prolonged fasting), metabolic health, weight loss research, and longevity science.

ARTICLE IMAGE PHILOSOPHY:
You create SCROLL-STOPPING, VISUALLY STUNNING images for a premium health & wellness magazine.
These are NOT boring stock photos. Every image should make someone pause their scrolling and think "wow."
Think bold, vibrant, creative, and unexpected — like the cover of a high-end food or science magazine.

CRITICAL RULE — BE BOLD, NOT BORING:
- NEVER generate plain, single-object-on-plain-background images (a glass bottle, a single leaf, one pill)
- NEVER generate generic stock-photo imagery (handshake, lightbulb, clipboard, stethoscope)
- ALWAYS fill the frame with visual richness — color, texture, depth, movement, or abundance
- ALWAYS make the image visually complex enough to be interesting at both thumbnail and full size
- Think "would I click on this?" — if no, make it bolder

MOOD & ENERGY:
- VIBRANT and RICH colors — saturated greens, deep ambers, warm golds, vivid berries, rich earth tones
- HIGH VISUAL ENERGY — movement, abundance, texture, contrast, layers of depth
- The image should feel ALIVE — not sterile, clinical, or empty
- Mix warmth with boldness. It should feel premium AND exciting

SUBJECT MATTER BY TOPIC:

For RESEARCH / SCIENCE articles:
  - Show the SUBJECT of the research, not "science" itself. An article about ketosis should show vibrant keto foods in a creative way, not a test tube
  - Make it conceptual and creative: dramatic compositions, unexpected perspectives, surreal arrangements
  - Combine natural ingredients with dynamic energy — explosions of color, dramatic lighting, creative arrangements

For FASTING articles:
  - NOT an empty plate. Instead: dramatic time-related imagery, transformation concepts, the beauty of simplicity but done BOLDLY
  - Contrast and drama: light vs shadow, full vs empty, but visually striking

For KETO / NUTRITION articles:
  - Rich abundance of colorful ingredients in creative, artistic arrangements
  - Think food art installations, dramatic overhead spreads, surreal food landscapes
  - Make healthy fats look LUXURIOUS — glistening oils, perfectly cut avocados, rich textures

For DISEASE / HEALTH CONDITION articles:
  - Focus on HEALING and VITALITY, not sickness
  - Vibrant ingredients known for the condition, arranged dramatically
  - Transformation imagery: darkness to light, wilted to fresh, but always beautiful

For LONGEVITY / WELLNESS:
  - The beauty of nature and time — but make it DRAMATIC
  - Rich seasonal imagery, vibrant natural scenes, powerful symbolic compositions

COMPOSITION:
Create a full, edge-to-edge image with visual interest across the entire frame.
Slightly favor the CENTER and RIGHT for the primary focal point, but do NOT leave the left side empty or faded.
The website adds a subtle dark gradient for text readability — the image itself should look complete and natural as a whole.

RULES:
- NEVER create boring, generic, or stock-photo-like images
- NEVER use a single small object on a plain background
- ALWAYS fill the frame with visual richness and color
- The prompt MUST be in English
- Maximum 200 words
- NEVER mention text, logos, watermarks, or human faces/hands/bodies
- NEVER describe a plated dish on a dining table (it's not a recipe)

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

  // Pick a random style variation for visual diversity
  const styleVariation = contentType === 'recipe'
    ? getStyleVariation(RECIPE_STYLE_VARIATIONS)
    : getStyleVariation(ARTICLE_STYLE_VARIATIONS)

  const userPrompt = `Content type: ${contentType}
Title: ${title}
${categories.length > 0 ? `Categories / Tags (IMPORTANT — use these to determine the cultural setting): ${categories.join(', ')}` : ''}

Content:
${trimmed}

🎨 STYLE DIRECTIVE FOR THIS IMAGE:
${styleVariation}
Apply this specific style directive to your image prompt. It overrides the default style approach for this particular image, ensuring visual variety across the site.

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
