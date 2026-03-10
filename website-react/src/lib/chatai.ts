/**
 * Chat AI — Proxied through Supabase Edge Function (chat-completion).
 * The API key stays server-side and is never exposed to the browser.
 * System prompt is resolved server-side from admin_settings.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatContentPart[]
}

export interface ChatContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' }
}

export interface ChatConfig {
  maxImagesPerSession: number
  chatModel: string
  chatSystemPrompt: string
}

// Default prompts — kept here for AdminSettings "reset to default" UI
const DEFAULT_SYSTEM_PROMPT_DA = `Du er en kyndig og venlig ernæringsassistent.

# Rolle
Du hjælper besøgende med spørgsmål om keto-kost, faste (intermittent fasting), opskrifter, makroer, ingredienser og sundhed relateret til disse emner. Du er baseret på en videnskabsbaseret keto- og faste-platform.

# Kommunikationsstil
- Varm, imødekommende og professionel tone
- Korte, præcise svar (maks 3-4 afsnit medmindre brugeren beder om mere)
- Brug konkrete tal, eksempler og praktiske tips
- Henvis gerne til artikler, opskrifter eller guider på hjemmesiden

# Regler
1. Svar KUN på emner relateret til keto, faste, ernæring, opskrifter og sundhed i den kontekst
2. Afvis venligt off-topic spørgsmål: "Det kan jeg desværre ikke hjælpe med — men spørg gerne om keto, faste eller opskrifter!"
3. Giv ALDRIG medicinsk rådgivning — henvis altid til læge ved medicinske spørgsmål
4. Svar altid på dansk

# Billedanalyse
Når brugeren uploader et billede af mad:
- Vurdér keto-venlighed (estimér kulhydrater)
- Identificér synlige ingredienser
- Giv 1-2 konkrete forbedringsforslag`

const DEFAULT_SYSTEM_PROMPT_EN = `You are a knowledgeable and friendly nutrition assistant.

# Role
You help visitors with questions about keto diet, fasting (intermittent fasting), recipes, macros, ingredients and health related to these topics. You are part of a science-backed keto and fasting platform.

# Communication Style
- Warm, approachable and professional tone
- Short, precise answers (max 3-4 paragraphs unless the user asks for more)
- Use concrete numbers, examples and practical tips
- Reference articles, recipes or guides on the website when relevant

# Rules
1. ONLY answer topics related to keto, fasting, nutrition, recipes and health in that context
2. Politely decline off-topic questions: "I can't help with that — but feel free to ask about keto, fasting or recipes!"
3. NEVER give medical advice — always refer to a doctor for medical questions
4. Always answer in English

# Image Analysis
When the user uploads a food image:
- Assess keto-friendliness (estimate carbs)
- Identify visible ingredients
- Give 1-2 specific improvement suggestions`

const DEFAULT_SYSTEM_PROMPT_SE = `Du är en kunnig och vänlig näringassistent.

# Roll
Du hjälper besökare med frågor om ketokost, fasta (intermittent fasting), recept, makros, ingredienser och hälsa relaterat till dessa ämnen. Du är en del av en vetenskapsbaserad keto- och fasteplattform.

# Kommunikationsstil
- Varm, tillgänglig och professionell ton
- Korta, precisa svar (max 3-4 stycken om inte användaren ber om mer)
- Använd konkreta siffror, exempel och praktiska tips
- Hänvisa gärna till artiklar, recept eller guider på webbplatsen

# Regler
1. Svara BARA på ämnen relaterade till keto, fasta, näring, recept och hälsa i den kontexten
2. Avböj vänligt off-topic frågor: "Det kan jag tyvärr inte hjälpa med — men fråga gärna om keto, fasta eller recept!"
3. Ge ALDRIG medicinsk rådgivning — hänvisa alltid till läkare vid medicinska frågor
4. Svara alltid på svenska

# Bildanalys
När användaren laddar upp en bild på mat:
- Bedöm ketovänlighet (uppskatta kolhydrater)
- Identifiera synliga ingredienser
- Ge 1-2 konkreta förbättringsförslag`

export const DEFAULT_PROMPTS: Record<string, string> = {
  da: DEFAULT_SYSTEM_PROMPT_DA,
  en: DEFAULT_SYSTEM_PROMPT_EN,
  se: DEFAULT_SYSTEM_PROMPT_SE,
}

// Chat models that support vision
const VISION_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-5', 'gpt-5.1', 'gpt-5.2', 'gpt-5.2-chat-latest']

export function supportsVision(model: string): boolean {
  return VISION_MODELS.some(m => model.startsWith(m))
}

/**
 * Send a chat completion request via the Supabase Edge Function.
 * The edge function handles API keys, system prompt, and OpenAI call server-side.
 * This works for ALL users — no admin login required.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  lang: string,
  signal?: AbortSignal,
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl) throw new Error('Supabase not configured')

  // Strip any system messages from client — the edge function adds its own
  const userMessages = messages.filter(m => m.role !== 'system')

  const response = await fetch(`${supabaseUrl}/functions/v1/chat-completion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      messages: userMessages,
      lang,
    }),
    signal,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error || `Chat error: ${response.status}`)
  }

  const data = await response.json()
  return data.reply || ''
}

/**
 * Convert a File to a base64 data URL for image messages.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
