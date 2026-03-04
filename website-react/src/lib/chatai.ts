/**
 * Chat AI — OpenAI integration for the website chat widget.
 * Uses the same admin_settings for API key/model, but with a
 * dedicated system prompt stored in admin_settings as 'chat_system_prompt'.
 */

import { getSettings } from './openai'

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

const DEFAULT_SYSTEM_PROMPT_DA = `Du er en venlig keto- og fasteassistent for Shifting Source — en videnskabsbaseret keto- og fasteplatform.

VIGTIGE REGLER:
- Du må KUN svare på spørgsmål relateret til keto-kost, faste, opskrifter, ingredienser og sundhed i forbindelse med keto/faste.
- Du skal basere dine svar på indholdet fra Shifting Source-hjemmesiden (artikler, opskrifter, guider). Henvis gerne til relevante sider.
- Hvis brugeren spørger om noget der IKKE er relateret til keto, faste eller sundhed, skal du venligt forklare at du kun kan hjælpe med keto- og faste-relaterede emner.
- Du svarer kort, præcist og i en varm, imødekommende tone.
- Hvis brugeren uploader et billede af mad, analyserer du om det er keto-venligt (lavt kulhydratindhold), identificerer ingredienser og giver forbedringsforslag.
- Du anbefaler ALTID at konsultere en læge for medicinske spørgsmål.
- Du må ikke give medicinsk rådgivning, kun generel keto/faste-information.
- Svar på dansk.`

const DEFAULT_SYSTEM_PROMPT_EN = `You are a friendly keto and fasting assistant for Shifting Source — a science-backed keto and fasting lifestyle platform.

IMPORTANT RULES:
- You may ONLY answer questions related to keto diet, fasting, recipes, ingredients and health in the context of keto/fasting.
- Base your answers on content from the Shifting Source website (articles, recipes, guides). Reference relevant pages when possible.
- If the user asks about something NOT related to keto, fasting or health, politely explain that you can only help with keto and fasting topics.
- Answer concisely in a warm, approachable tone.
- If the user uploads a food image, analyze whether it's keto-friendly (low carb content), identify ingredients and suggest improvements.
- ALWAYS recommend consulting a doctor for medical questions.
- Do not give medical advice, only general keto/fasting information.
- Answer in English.`

const DEFAULT_SYSTEM_PROMPT_SE = `Du är en vänlig keto- och fasteassistent för Shifting Source — en vetenskapsbaserad keto- och fasteplattform.

VIKTIGA REGLER:
- Du får BARA svara på frågor relaterade till ketokost, fasta, recept, ingredienser och hälsa i samband med keto/fasta.
- Basera dina svar på innehåll från Shifting Source-webbplatsen (artiklar, recept, guider). Hänvisa gärna till relevanta sidor.
- Om användaren frågar om något som INTE är relaterat till keto, fasta eller hälsa, förklara vänligt att du bara kan hjälpa med keto- och fasterelaterade ämnen.
- Svara kort, koncist och med en varm, tillgänglig ton.
- Om användaren laddar upp en bild på mat, analysera om den är ketovänlig (lågt kolhydratinnehåll), identifiera ingredienser och ge förbättringsförslag.
- Rekommendera ALLTID att konsultera en läkare för medicinska frågor.
- Ge inte medicinsk rådgivning, bara allmän keto/fasta-information.
- Svara på svenska.`

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
 * Get the system prompt for a given language.
 * Checks admin_settings first, falls back to defaults.
 */
export async function getChatSystemPrompt(lang: string): Promise<string> {
  try {
    const settings = await getSettings()
    const key = `chat_system_prompt_${lang}`
    const custom = settings[key]
    if (custom && custom.trim()) return custom
  } catch {}
  return DEFAULT_PROMPTS[lang] || DEFAULT_PROMPTS['en']
}

/**
 * Send a chat completion request to OpenAI.
 * Supports text and image messages.
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const settings = await getSettings()
  const apiKey = settings.openai_api_key
  if (!apiKey) throw new Error('OpenAI API key not configured')

  // Use the chat-specific model if set, otherwise fall back to the general model
  const model = settings.ai_model || 'gpt-4.1'

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: 2000,
    }),
    signal,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.error?.message || `API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
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
