/**
 * Social Media Publisher — Lib
 * Manages connected accounts, publish queue, platform integrations,
 * and AI-powered caption generation for cross-posting.
 */
import { supabase } from './supabase'
import { getSettings } from './openai'

// ── Types ──────────────────────────────────────────────

export type Platform = 'instagram' | 'facebook' | 'youtube' | 'tiktok'
export type MediaType = 'image' | 'video' | 'text' | 'carousel'
export type QueueStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'partial' | 'failed'
export type LogStatus = 'pending' | 'success' | 'failed' | 'rate_limited'

export interface ConnectedAccount {
  id: string
  user_id: string
  platform: Platform
  platform_user_id: string | null
  platform_username: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  scopes: string[] | null
  page_id: string | null
  page_name: string | null
  is_active: boolean
  connected_at: string
  updated_at: string
}

export interface PublishQueueItem {
  id: string
  user_id: string
  content_text: string | null
  media_urls: string[] | null
  media_type: MediaType
  platforms: Platform[]
  scheduled_at: string | null
  status: QueueStatus
  article_id: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface PublishLogEntry {
  id: string
  queue_id: string
  account_id: string
  platform: Platform
  status: LogStatus
  platform_post_id: string | null
  platform_post_url: string | null
  error_message: string | null
  response_data: Record<string, unknown> | null
  attempted_at: string
  completed_at: string | null
}

// ── Connected Accounts ─────────────────────────────────

export async function getConnectedAccounts(): Promise<ConnectedAccount[]> {
  const { data, error } = await supabase
    .from('social_connected_accounts')
    .select('*')
    .eq('is_active', true)
    .order('connected_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function disconnectAccount(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('social_connected_accounts')
    .update({ is_active: false })
    .eq('id', accountId)

  if (error) throw error
}

export async function saveConnectedAccount(account: Partial<ConnectedAccount> & { platform: Platform }): Promise<ConnectedAccount> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('social_connected_accounts')
    .upsert({
      ...account,
      user_id: user.id,
      is_active: true,
    }, {
      onConflict: 'user_id,platform,platform_user_id',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ── Publish Queue ──────────────────────────────────────

export async function getPublishQueue(
  status?: QueueStatus,
  limit = 50
): Promise<PublishQueueItem[]> {
  let query = supabase
    .from('social_publish_queue')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createPost(post: {
  content_text?: string
  media_urls?: string[]
  media_type?: MediaType
  platforms: Platform[]
  scheduled_at?: string | null
  article_id?: string | null
  tags?: string[]
}): Promise<PublishQueueItem> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const status: QueueStatus = post.scheduled_at ? 'scheduled' : 'draft'

  const { data, error } = await supabase
    .from('social_publish_queue')
    .insert({
      user_id: user.id,
      content_text: post.content_text || null,
      media_urls: post.media_urls || null,
      media_type: post.media_type || 'text',
      platforms: post.platforms,
      scheduled_at: post.scheduled_at || null,
      status,
      article_id: post.article_id || null,
      tags: post.tags || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePost(
  postId: string,
  updates: Partial<Pick<PublishQueueItem, 'content_text' | 'media_urls' | 'media_type' | 'platforms' | 'scheduled_at' | 'tags' | 'status'>>
): Promise<PublishQueueItem> {
  const { data, error } = await supabase
    .from('social_publish_queue')
    .update(updates)
    .eq('id', postId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase
    .from('social_publish_queue')
    .delete()
    .eq('id', postId)

  if (error) throw error
}

// ── Publishing ─────────────────────────────────────────

export async function publishNow(postId: string): Promise<{ success: boolean; results: PublishLogEntry[] }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  // Call the Edge Function to handle actual publishing
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-publisher`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'publish', postId }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Publishing failed')
  }

  return response.json()
}

// ── Publish Logs ───────────────────────────────────────

export async function getPublishLogs(queueId?: string, limit = 100): Promise<PublishLogEntry[]> {
  let query = supabase
    .from('social_publish_log')
    .select('*')
    .order('attempted_at', { ascending: false })
    .limit(limit)

  if (queueId) query = query.eq('queue_id', queueId)

  const { data, error } = await query
  if (error) throw error
  return data || []
}

// ── OAuth Helpers ──────────────────────────────────────

export function getOAuthUrl(platform: Platform): string {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL
  const redirectUri = `${window.location.origin}/admin/social-publisher/callback`

  switch (platform) {
    case 'instagram':
    case 'facebook':
      // Meta OAuth — uses Edge Function to start flow
      return `${baseUrl}/functions/v1/social-publisher?action=oauth&platform=${platform}&redirect_uri=${encodeURIComponent(redirectUri)}`

    case 'youtube':
      return `${baseUrl}/functions/v1/social-publisher?action=oauth&platform=youtube&redirect_uri=${encodeURIComponent(redirectUri)}`

    case 'tiktok':
      return `${baseUrl}/functions/v1/social-publisher?action=oauth&platform=tiktok&redirect_uri=${encodeURIComponent(redirectUri)}`

    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

// ── Media Upload ───────────────────────────────────────

export async function uploadMedia(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `social-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from('uploads')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('uploads')
    .getPublicUrl(path)

  return publicUrl
}

// ── AI Caption Generation ──────────────────────────────

export interface CaptionRequest {
  platform: Platform
  contentType: 'article' | 'recipe'
  title: string
  summary: string
  categories: string[]
  tags: string[]
  lang: string
  url?: string
  nutritionInfo?: string   // For recipes: "320 kcal, 5g netto carbs, 25g fedt"
}

const CAPTION_SYSTEM_PROMPTS: Record<Platform, string> = {
  instagram: `Du er en social media-ekspert for "Shifting Source" — en videnskabsbaseret keto & faste livsstilsplatform.

Skriv en Instagram caption. Regler:
- Max 2200 tegn (helst 300-800 for bedst engagement)
- Start med en fængende hook (emoji + kort sætning)
- 2-4 korte afsnit med linjeskift imellem
- Inkluder 5-8 relevante hashtags til sidst (altid inkluder #shiftingsource #keto)
- Afslut med CTA: "Link i bio for den fulde opskrift/artikel 👆"
- Brug emojis naturligt (ikke overdrevet)
- Tone: Varm, inspirerende, videnskabsbaseret men tilgængelig
- Links virker IKKE i Instagram captions — henvis altid til "link i bio"`,

  facebook: `Du er en social media-ekspert for "Shifting Source" — en videnskabsbaseret keto & faste livsstilsplatform.

Skriv et Facebook-opslag. Regler:
- Længere og mere informativt end Instagram (300-1500 tegn)
- Start med en engagerende indledning
- Inkluder vigtige pointer fra indholdet
- Max 2-3 hashtags (Facebook straffer overdreven brug)
- Afslut med et direkte link til artiklen/opskriften (hvis URL er givet)
- Stil et spørgsmål til sidst for at øge engagement
- Tone: Informativ, venlig, inviterer til diskussion`,

  youtube: `Du er en social media-ekspert for "Shifting Source" — en videnskabsbaseret keto & faste livsstilsplatform.

Skriv en YouTube-titel OG beskrivelse adskilt af "---". Regler:
TITEL (før ---):
- Max 100 tegn
- Søgevenlig med relevante keywords
- Fængende men ikke clickbait

BESKRIVELSE (efter ---):
- Første 2-3 linjer er kritiske (vises før "Vis mere")
- Inkluder tidsstempler-skabelon (00:00 Intro, etc.)
- Inkluder relevante links
- 3-5 relevante hashtags
- Afslut med: "Abonner for mere keto & faste indhold fra Shifting Source"`,

  tiktok: `Du er en social media-ekspert for "Shifting Source" — en videnskabsbaseret keto & faste livsstilsplatform.

Skriv en TikTok-caption. Regler:
- ULTRA-KORT: Max 150 tegn tekst + 3-5 hashtags
- Start med en hook: Spørgsmål, dristig påstand, eller overraskende fakta
- Brug viral-sprogtone (direkte, energisk)
- Hashtags: #keto #shiftingsource + 2-3 trending/niche tags
- Ingen links (TikTok skjuler dem)
- Tone: Energisk, direkte, nysgerrighedsvækkende`,
}

export async function generateSocialCaption(params: CaptionRequest): Promise<string> {
  const settings = await getSettings()

  if (!settings.openai_api_key) {
    throw new Error('OpenAI API key er ikke konfigureret. Gå til Admin → Indstillinger.')
  }

  const model = settings.ai_model || 'gpt-5.2-chat-latest'
  const systemPrompt = CAPTION_SYSTEM_PROMPTS[params.platform]

  const contentDescription = params.contentType === 'recipe'
    ? `OPSKRIFT: "${params.title}"
Beskrivelse: ${params.summary}
${params.nutritionInfo ? `Næringsindhold: ${params.nutritionInfo}` : ''}
Kategorier: ${params.categories.join(', ')}
Tags: ${params.tags.join(', ')}
${params.url ? `Link: ${params.url}` : ''}`
    : `ARTIKEL: "${params.title}"
Resumé: ${params.summary}
Kategorier: ${params.categories.join(', ')}
Tags: ${params.tags.join(', ')}
${params.url ? `Link: ${params.url}` : ''}`

  const userPrompt = `Skriv caption på ${params.lang === 'da' ? 'dansk' : params.lang === 'se' ? 'svensk' : 'engelsk'} for følgende ${params.contentType === 'recipe' ? 'opskrift' : 'artikel'}:

${contentDescription}

Returner KUN caption-teksten — ingen forklaring, ingen anførselstegn, ingen markdown.`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.openai_api_key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: 2000,
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `OpenAI API fejl: ${response.status}`)
  }

  const data = await response.json()
  return (data.choices?.[0]?.message?.content || '').trim()
}

export async function generateAllCaptions(
  platforms: Platform[],
  params: Omit<CaptionRequest, 'platform'>
): Promise<Record<Platform, string>> {
  const results: Partial<Record<Platform, string>> = {}

  // Generate in parallel for speed
  const promises = platforms.map(async (platform) => {
    try {
      const caption = await generateSocialCaption({ ...params, platform })
      results[platform] = caption
    } catch (err) {
      results[platform] = `[Fejl ved generering: ${(err as Error).message}]`
    }
  })

  await Promise.all(promises)
  return results as Record<Platform, string>
}

// ── Platform Format Specifications ─────────────────────

export interface ImageSpec {
  formats: string[]         // Accepted MIME types
  maxSizeMB: number
  aspectRatios: string[]    // Recommended aspect ratios
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
  recommended: string       // Best practice size
}

export interface VideoSpec {
  formats: string[]
  maxSizeMB: number
  maxDurationSec: number
  minDurationSec: number
  aspectRatios: string[]
  maxResolution: string
  recommended: string
  codecsNote: string
}

export interface PlatformSpec {
  name: string
  color: string
  maxChars: number
  maxHashtags: number
  supportsText: boolean
  supportsImage: boolean
  supportsVideo: boolean
  supportsCarousel: boolean
  supportsStories: boolean
  supportsReels: boolean
  maxImages: number          // Max images in carousel/post
  image: ImageSpec
  video: VideoSpec
  notes: string[]            // Platform-specific gotchas
}

export const PLATFORM_INFO: Record<Platform, PlatformSpec> = {
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    maxChars: 2200,
    maxHashtags: 30,
    supportsText: false,       // Instagram requires media
    supportsImage: true,
    supportsVideo: true,
    supportsCarousel: true,
    supportsStories: true,
    supportsReels: true,
    maxImages: 10,
    image: {
      formats: ['image/jpeg', 'image/png', 'image/webp'],
      maxSizeMB: 8,
      aspectRatios: ['1:1', '4:5', '1.91:1'],
      minWidth: 320,
      maxWidth: 1440,
      minHeight: 320,
      maxHeight: 1800,
      recommended: '1080×1080 (feed), 1080×1350 (portrait 4:5), 1080×608 (landscape 1.91:1)',
    },
    video: {
      formats: ['video/mp4', 'video/quicktime'],
      maxSizeMB: 650,          // Reels up to 650MB
      maxDurationSec: 5400,    // 90 min for video, 90 sec for Reels
      minDurationSec: 3,
      aspectRatios: ['9:16', '1:1', '4:5'],
      maxResolution: '1920×1080',
      recommended: '1080×1920 (Reels 9:16), 1080×1080 (Feed), 1080×1350 (Feed portrait)',
      codecsNote: 'H.264, AAC audio, 30fps recommended',
    },
    notes: [
      'Tekst-only opslag er ikke mulige — der skal altid være et billede eller video',
      'Karrusel: 2-10 billeder/videoer, alle skal have samme aspect ratio',
      'Reels: 9:16 format, 3-90 sekunder',
      'Hashtags: Max 30, men 3-5 relevante anbefales',
      'Link i caption er ikke klikbart — brug "Link i bio"',
    ],
  },

  facebook: {
    name: 'Facebook',
    color: '#1877F2',
    maxChars: 63206,
    maxHashtags: 30,           // No hard limit but fewer is better
    supportsText: true,
    supportsImage: true,
    supportsVideo: true,
    supportsCarousel: true,
    supportsStories: true,
    supportsReels: true,
    maxImages: 10,
    image: {
      formats: ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/tiff', 'image/webp'],
      maxSizeMB: 10,
      aspectRatios: ['1.91:1', '1:1', '4:5'],
      minWidth: 200,
      maxWidth: 4096,
      minHeight: 200,
      maxHeight: 4096,
      recommended: '1200×630 (link share), 1080×1080 (feed), 1080×1350 (portrait)',
    },
    video: {
      formats: ['video/mp4', 'video/quicktime', 'video/avi', 'video/x-msvideo'],
      maxSizeMB: 10240,       // 10 GB
      maxDurationSec: 14400,   // 4 timer
      minDurationSec: 1,
      aspectRatios: ['16:9', '9:16', '1:1', '4:5'],
      maxResolution: '4096×2048',
      recommended: '1920×1080 (landscape), 1080×1920 (portrait/Reels), 1080×1080 (square)',
      codecsNote: 'H.264, AAC audio, max 30fps for Reels',
    },
    notes: [
      'Tekst-only opslag fungerer godt organisk',
      'Links i tekst genererer automatisk preview-kort',
      'Reels: 9:16, 3-90 sekunder',
      'Billedkvalitet: Brug PNG for grafik, JPG for fotos',
    ],
  },

  youtube: {
    name: 'YouTube',
    color: '#FF0000',
    maxChars: 5000,            // Description limit
    maxHashtags: 15,           // Max in description, only first 3 shown
    supportsText: false,
    supportsImage: false,      // Thumbnails only, not standalone images
    supportsVideo: true,
    supportsCarousel: false,
    supportsStories: false,
    supportsReels: false,      // "Shorts" instead
    maxImages: 0,
    image: {
      formats: ['image/jpeg', 'image/png'],
      maxSizeMB: 2,
      aspectRatios: ['16:9'],
      minWidth: 1280,
      maxWidth: 3840,
      minHeight: 720,
      maxHeight: 2160,
      recommended: '1280×720 (thumbnail, 16:9)',
    },
    video: {
      formats: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'],
      maxSizeMB: 131072,      // 128 GB (verified accounts)
      maxDurationSec: 43200,   // 12 timer
      minDurationSec: 1,
      aspectRatios: ['16:9', '9:16'],
      maxResolution: '3840×2160',
      recommended: '1920×1080 (standard), 3840×2160 (4K), 1080×1920 (Shorts 9:16)',
      codecsNote: 'H.264 eller H.265, AAC audio, op til 60fps',
    },
    notes: [
      'YouTube kræver altid en video — ingen billede-opslag',
      'Shorts: 9:16 format, max 60 sekunder',
      'Titel: Max 100 tegn',
      'Beskrivelse: Max 5.000 tegn, første 2-3 linjer er synlige',
      'Tags: Brug relevante søgeord, max 500 tegn total',
      'Thumbnail: Upload separat som 1280×720 JPG/PNG',
    ],
  },

  tiktok: {
    name: 'TikTok',
    color: '#000000',
    maxChars: 2200,
    maxHashtags: 5,            // Best practice, no hard limit
    supportsText: false,
    supportsImage: true,       // Photo mode (up to 35 images)
    supportsVideo: true,
    supportsCarousel: true,    // Photo slideshow
    supportsStories: true,
    supportsReels: false,
    maxImages: 35,
    image: {
      formats: ['image/jpeg', 'image/png', 'image/webp'],
      maxSizeMB: 20,
      aspectRatios: ['9:16', '1:1'],
      minWidth: 360,
      maxWidth: 4096,
      minHeight: 640,
      maxHeight: 4096,
      recommended: '1080×1920 (photo mode 9:16), 1080×1080 (square)',
    },
    video: {
      formats: ['video/mp4', 'video/quicktime', 'video/webm'],
      maxSizeMB: 4096,        // 4 GB via API
      maxDurationSec: 600,     // 10 minutter
      minDurationSec: 3,
      aspectRatios: ['9:16', '1:1'],
      maxResolution: '4096×2160',
      recommended: '1080×1920 (9:16 vertical), 1920×1080 (landscape vises med bars)',
      codecsNote: 'H.264, AAC audio, 30fps anbefalet',
    },
    notes: [
      'Vertikal video (9:16) performer markant bedst',
      'Tekst-only er ikke muligt — kræver billede eller video',
      'Photo mode: Op til 35 billeder som slideshow',
      'API publishing kræver TikTok Developer godkendelse',
      'Lyd/musik kan ikke tilføjes via API',
    ],
  },
}

// ── Media Validation ───────────────────────────────────

export interface ValidationError {
  platform: Platform
  field: 'image' | 'video' | 'text' | 'general'
  message: string
  severity: 'error' | 'warning'
}

export function validatePostForPlatforms(
  platforms: Platform[],
  text: string,
  mediaUrls: string[],
  mediaType: MediaType,
  fileMetadata?: { type: string; sizeMB: number; width?: number; height?: number }[]
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const platform of platforms) {
    const spec = PLATFORM_INFO[platform]

    // Text validation
    if (text.length > spec.maxChars) {
      errors.push({
        platform,
        field: 'text',
        message: `Tekst er ${text.length} tegn — ${spec.name} tillader max ${spec.maxChars}`,
        severity: 'error',
      })
    }

    // Hashtag count
    const hashtags = (text.match(/#\w+/g) || []).length
    if (hashtags > spec.maxHashtags) {
      errors.push({
        platform,
        field: 'text',
        message: `${hashtags} hashtags — ${spec.name} anbefaler max ${spec.maxHashtags}`,
        severity: 'warning',
      })
    }

    // Media requirement
    if (!spec.supportsText && mediaUrls.length === 0 && mediaType === 'text') {
      errors.push({
        platform,
        field: 'general',
        message: `${spec.name} kræver billede eller video — tekst-only er ikke muligt`,
        severity: 'error',
      })
    }

    // Image count
    if (mediaType === 'carousel' && mediaUrls.length > spec.maxImages) {
      errors.push({
        platform,
        field: 'image',
        message: `${mediaUrls.length} billeder — ${spec.name} tillader max ${spec.maxImages} i karrusel`,
        severity: 'error',
      })
    }

    // Video-only platforms
    if (platform === 'youtube' && mediaType !== 'video' && mediaUrls.length > 0) {
      errors.push({
        platform,
        field: 'general',
        message: 'YouTube understøtter kun video-uploads',
        severity: 'error',
      })
    }

    // File metadata validation
    if (fileMetadata) {
      for (const file of fileMetadata) {
        const isVideo = file.type.startsWith('video/')
        const specMedia = isVideo ? spec.video : spec.image

        // File format
        if (!specMedia.formats.includes(file.type)) {
          errors.push({
            platform,
            field: isVideo ? 'video' : 'image',
            message: `${spec.name} understøtter ikke ${file.type} — brug ${specMedia.formats.join(', ')}`,
            severity: 'error',
          })
        }

        // File size
        if (file.sizeMB > specMedia.maxSizeMB) {
          errors.push({
            platform,
            field: isVideo ? 'video' : 'image',
            message: `Fil er ${file.sizeMB.toFixed(1)}MB — ${spec.name} max ${specMedia.maxSizeMB}MB`,
            severity: 'error',
          })
        }

        // Dimensions
        if (!isVideo && file.width && file.height) {
          if (file.width < spec.image.minWidth || file.height < spec.image.minHeight) {
            errors.push({
              platform,
              field: 'image',
              message: `Billede er ${file.width}×${file.height} — ${spec.name} kræver minimum ${spec.image.minWidth}×${spec.image.minHeight}`,
              severity: 'error',
            })
          }
          if (file.width > spec.image.maxWidth || file.height > spec.image.maxHeight) {
            errors.push({
              platform,
              field: 'image',
              message: `Billede er ${file.width}×${file.height} — ${spec.name} max ${spec.image.maxWidth}×${spec.image.maxHeight}`,
              severity: 'warning',
            })
          }
        }
      }
    }
  }

  return errors
}

// ── Format Helpers ─────────────────────────────────────

export function getRecommendedFormat(platform: Platform, mediaType: MediaType): string {
  const spec = PLATFORM_INFO[platform]
  if (mediaType === 'video') return spec.video.recommended
  return spec.image.recommended
}

export function getPlatformNotes(platform: Platform): string[] {
  return PLATFORM_INFO[platform].notes
}
