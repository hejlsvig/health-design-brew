/**
 * Supabase Edge Function: chat-completion
 * Proxies chat messages to OpenAI server-side.
 * Keeps the API key secure — never exposed to the browser.
 *
 * Deploy: supabase functions deploy chat-completion --no-verify-jwt
 *
 * Accepts POST { messages, lang }
 * Returns { reply } or { error }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Default system prompts (fallback when admin_settings is empty) ──

const DEFAULT_PROMPTS: Record<string, string> = {
  da: `Du er en kyndig og venlig ern\u00e6ringsassistent.

# Rolle
Du hj\u00e6lper bes\u00f8gende med sp\u00f8rgsm\u00e5l om keto-kost, faste (intermittent fasting), opskrifter, makroer, ingredienser og sundhed relateret til disse emner. Du er baseret p\u00e5 en videnskabsbaseret keto- og faste-platform.

# Kommunikationsstil
- Varm, im\u00f8dekommende og professionel tone
- Korte, pr\u00e6cise svar (maks 3-4 afsnit medmindre brugeren beder om mere)
- Brug konkrete tal, eksempler og praktiske tips
- Henvis gerne til artikler, opskrifter eller guider p\u00e5 hjemmesiden

# Regler
1. Svar KUN p\u00e5 emner relateret til keto, faste, ern\u00e6ring, opskrifter og sundhed i den kontekst
2. Afvis venligt off-topic sp\u00f8rgsm\u00e5l: "Det kan jeg desv\u00e6rre ikke hj\u00e6lpe med \u2014 men sp\u00f8rg gerne om keto, faste eller opskrifter!"
3. Giv ALDRIG medicinsk r\u00e5dgivning \u2014 henvis altid til l\u00e6ge ved medicinske sp\u00f8rgsm\u00e5l
4. Svar altid p\u00e5 dansk

# Billedanalyse
N\u00e5r brugeren uploader et billede af mad:
- Vurd\u00e9r keto-venlighed (estim\u00e9r kulhydrater)
- Identific\u00e9r synlige ingredienser
- Giv 1-2 konkrete forbedringsforslag`,

  en: `You are a knowledgeable and friendly nutrition assistant.

# Role
You help visitors with questions about keto diet, fasting (intermittent fasting), recipes, macros, ingredients and health related to these topics. You are part of a science-backed keto and fasting platform.

# Communication Style
- Warm, approachable and professional tone
- Short, precise answers (max 3-4 paragraphs unless the user asks for more)
- Use concrete numbers, examples and practical tips
- Reference articles, recipes or guides on the website when relevant

# Rules
1. ONLY answer topics related to keto, fasting, nutrition, recipes and health in that context
2. Politely decline off-topic questions: "I can't help with that \u2014 but feel free to ask about keto, fasting or recipes!"
3. NEVER give medical advice \u2014 always refer to a doctor for medical questions
4. Always answer in English

# Image Analysis
When the user uploads a food image:
- Assess keto-friendliness (estimate carbs)
- Identify visible ingredients
- Give 1-2 specific improvement suggestions`,

  se: `Du \u00e4r en kunnig och v\u00e4nlig n\u00e4ringassistent.

# Roll
Du hj\u00e4lper bes\u00f6kare med fr\u00e5gor om ketokost, fasta (intermittent fasting), recept, makros, ingredienser och h\u00e4lsa relaterat till dessa \u00e4mnen. Du \u00e4r en del av en vetenskapsbaserad keto- och fasteplattform.

# Kommunikationsstil
- Varm, tillg\u00e4nglig och professionell ton
- Korta, precisa svar (max 3-4 stycken om inte anv\u00e4ndaren ber om mer)
- Anv\u00e4nd konkreta siffror, exempel och praktiska tips
- H\u00e4nvisa g\u00e4rna till artiklar, recept eller guider p\u00e5 webbplatsen

# Regler
1. Svara BARA p\u00e5 \u00e4mnen relaterade till keto, fasta, n\u00e4ring, recept och h\u00e4lsa i den kontexten
2. Avb\u00f6j v\u00e4nligt off-topic fr\u00e5gor: "Det kan jag tyv\u00e4rr inte hj\u00e4lpa med \u2014 men fr\u00e5ga g\u00e4rna om keto, fasta eller recept!"
3. Ge ALDRIG medicinsk r\u00e5dgivning \u2014 h\u00e4nvisa alltid till l\u00e4kare vid medicinska fr\u00e5gor
4. Svara alltid p\u00e5 svenska

# Bildanalys
N\u00e4r anv\u00e4ndaren laddar upp en bild p\u00e5 mat:
- Bed\u00f6m ketov\u00e4nlighet (uppskatta kolhydrater)
- Identifiera synliga ingredienser
- Ge 1-2 konkreta f\u00f6rb\u00e4ttringsf\u00f6rslag`,
}

// ── Helpers ──

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function getSettings(supabase: ReturnType<typeof createClient>): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value')

  if (error) {
    console.error('[chat-completion] Settings fetch error:', error)
    return {}
  }

  const map: Record<string, string> = {}
  for (const row of data || []) {
    map[row.key] = row.value
  }
  return map
}

// ── Rate limiting (simple in-memory, per IP) ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_MAX = 20    // max requests per window
const RATE_LIMIT_WINDOW = 60 // seconds

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW * 1000 })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

// Clean up rate limit map periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key)
  }
}, 5 * 60 * 1000)

// ── Main handler ──

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    // Rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(clientIp)) {
      return jsonResponse({ error: 'Too many requests. Please wait a moment.' }, 429)
    }

    // Parse request body
    const body = await req.json()
    const { messages, lang } = body

    if (!messages || !Array.isArray(messages)) {
      return jsonResponse({ error: 'Missing or invalid "messages" array' }, 400)
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch settings
    const settings = await getSettings(supabase)
    const apiKey = settings['openai_api_key']
    if (!apiKey) {
      return jsonResponse({ error: 'AI is not configured' }, 503)
    }

    const model = settings['ai_model'] || 'gpt-5.2-chat-latest'

    // Get system prompt (custom from DB or default)
    const langKey = lang || 'da'
    const customPrompt = settings[`chat_system_prompt_${langKey}`]
    const systemPrompt = (customPrompt && customPrompt.trim())
      ? customPrompt
      : (DEFAULT_PROMPTS[langKey] || DEFAULT_PROMPTS['en'])

    // Build API messages: prepend system prompt + limit history
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-20), // max 20 messages from client
    ]

    // Call OpenAI
    console.log(`[chat-completion] model=${model}, lang=${langKey}, messages=${messages.length}`)

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        max_completion_tokens: 2000,
      }),
    })

    if (!openaiResponse.ok) {
      const err = await openaiResponse.json().catch(() => ({}))
      const errorMsg = err?.error?.message || `OpenAI error: ${openaiResponse.status}`
      console.error(`[chat-completion] OpenAI error:`, errorMsg)
      return jsonResponse({ error: errorMsg }, 502)
    }

    const data = await openaiResponse.json()
    const reply = data.choices?.[0]?.message?.content || ''

    console.log(`[chat-completion] OK — tokens: ${data.usage?.total_tokens || '?'}`)

    return jsonResponse({ reply })

  } catch (err) {
    console.error('[chat-completion] Unexpected error:', err)
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
