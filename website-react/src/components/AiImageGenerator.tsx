import { useState, useRef } from 'react'
import { Sparkles, Loader2, ImagePlus, RefreshCw, Check, X, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { generateImagePrompt, generateImage } from '@/lib/kieai'
import { processImage, getProcessingOptions, type ImageContext } from '@/lib/imageProcessing'
import { supabase } from '@/lib/supabase'
import ImagePreviewWithSafeZone from '@/components/ImagePreviewWithSafeZone'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────

type Step = 'idle' | 'generating-prompt' | 'editing-prompt' | 'generating-image' | 'preview'

interface AiImageGeneratorProps {
  contentType: 'article' | 'recipe'
  title: string
  content: string
  categories?: string[]
  aspectRatio: '16:9' | '4:3'
  /** Called with the final Supabase public URL after processing + upload */
  onImageGenerated: (url: string) => void
  className?: string
}

// ── Component ────────────────────────────────────────────────────────

export default function AiImageGenerator({
  contentType,
  title,
  content,
  categories = [],
  aspectRatio,
  onImageGenerated,
  className,
}: AiImageGeneratorProps) {
  const [step, setStep] = useState<Step>('idle')
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const abortRef = useRef(false)

  // ── Auth pre-check: verify session BEFORE spending money on AI ──

  const verifyAuth = async (): Promise<boolean> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        // Try refreshing the session
        const { data: refreshData } = await supabase.auth.refreshSession()
        if (!refreshData.session) {
          setError('Din session er udløbet. Log ud og ind igen før du genererer billeder.')
          return false
        }
      }
      return true
    } catch {
      setError('Kunne ikke verificere din session. Log ud og ind igen.')
      return false
    }
  }

  // ── Step 1: Generate prompt via OpenAI ──

  const handleGeneratePrompt = async () => {
    if (!title && !content) {
      setError('Tilføj titel og indhold først — AI\'en har brug for kontekst til at generere en billedprompt.')
      return
    }

    setError('')

    // ★ Verify auth BEFORE generating (costs money)
    const isAuthenticated = await verifyAuth()
    if (!isAuthenticated) return

    setStep('generating-prompt')
    abortRef.current = false

    try {
      const generatedPrompt = await generateImagePrompt(contentType, title, content, categories)
      if (abortRef.current) return
      setPrompt(generatedPrompt)
      setStep('editing-prompt')
    } catch (err: any) {
      if (abortRef.current) return
      setError(err.message)
      setStep('idle')
    }
  }

  // ── Step 2 → 3: Generate image via Kie.ai ──

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Prompten kan ikke være tom.')
      return
    }

    setError('')

    // ★ Verify auth again before image generation (costs money)
    const isAuthenticated = await verifyAuth()
    if (!isAuthenticated) return

    setStep('generating-image')
    abortRef.current = false

    try {
      const imageUrl = await generateImage(prompt, aspectRatio)
      if (abortRef.current) return
      setPreviewUrl(imageUrl)
      setStep('preview')
    } catch (err: any) {
      if (abortRef.current) return
      setError(err.message)
      setStep('editing-prompt')
    }
  }

  // ── Step 4: Accept → process + upload via FTP to one.com ──

  /**
   * Downloads a remote image via the proxy-image Edge Function (bypasses CORS).
   * Falls back to direct fetch if proxy is unavailable.
   */
  const fetchImageViaProxy = async (imageUrl: string): Promise<Blob> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      try {
        console.log('[AiImageGen] Fetching image via proxy-image Edge Function...')
        const proxyResponse = await fetch(`${supabaseUrl}/functions/v1/proxy-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ url: imageUrl }),
        })

        if (proxyResponse.ok) {
          const contentType = proxyResponse.headers.get('Content-Type') || ''
          if (contentType.startsWith('image/')) {
            console.log('[AiImageGen] Image fetched via proxy successfully')
            return await proxyResponse.blob()
          }
        }

        // If proxy returned an error JSON, log it
        const errorText = await proxyResponse.text().catch(() => '')
        console.warn('[AiImageGen] Proxy failed:', proxyResponse.status, errorText)
      } catch (proxyErr) {
        console.warn('[AiImageGen] Proxy unavailable, trying direct fetch:', proxyErr)
      }
    }

    // Fallback: direct fetch (may fail due to CORS)
    const directResponse = await fetch(imageUrl)
    if (!directResponse.ok) throw new Error('Kunne ikke hente det genererede billede')
    return await directResponse.blob()
  }

  /**
   * Upload processed image to one.com via the upload-image-ftp Edge Function.
   * Sends the already-processed blob as base64 so the edge function doesn't
   * need to re-download from a potentially expired temporary URL.
   */
  const uploadViaFtp = async (_imageUrl: string, processedBlob: Blob, ext: string): Promise<string> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const session = (await supabase.auth.getSession()).data.session

    if (!session?.access_token) {
      throw new Error('Ikke logget ind — log ind igen og prøv igen.')
    }

    // Verify token is still valid before making the request
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
    if (userError || !currentUser) {
      // Token expired — try to refresh
      const { data: refreshData } = await supabase.auth.refreshSession()
      if (!refreshData.session) {
        throw new Error('Din session er udløbet. Log ud og ind igen.')
      }
    }

    // Get fresh session after potential refresh
    const freshSession = (await supabase.auth.getSession()).data.session
    const token = freshSession?.access_token || session.access_token

    const folder = contentType === 'recipe' ? 'recipes' : 'articles'
    const filename = `ai-${Date.now()}.${ext}`

    // Convert processed blob to base64 so edge function receives the actual image data
    // instead of a temporary URL that may expire
    console.log(`[AiImageGen] Converting ${processedBlob.size} byte blob to base64...`)
    const arrayBuffer = await processedBlob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    const imageBase64 = btoa(binary)
    const contentType64 = processedBlob.type || (ext === 'webp' ? 'image/webp' : 'image/jpeg')

    // Upload via FTP Edge Function with base64 image data
    console.log('[AiImageGen] Uploading via FTP Edge Function (base64 mode)...')
    const response = await fetch(`${supabaseUrl}/functions/v1/upload-image-ftp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ imageBase64, imageContentType: contentType64, folder, filename }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      const errorMsg = errorData.error || `FTP upload failed: ${response.status}`
      if (response.status === 401) {
        throw new Error('Autentificering fejlede — din session kan være udløbet. Prøv at logge ud og ind igen.')
      }
      if (response.status === 403) {
        throw new Error('Adgang nægtet — du skal være admin for at uploade billeder.')
      }
      throw new Error(errorMsg)
    }

    const result = await response.json()
    if (!result.publicUrl) {
      throw new Error('Ingen public URL returneret fra FTP upload')
    }

    console.log('[AiImageGen] FTP upload success:', result.publicUrl, 'verified:', result.verified)

    if (result.verified === false) {
      console.warn('[AiImageGen] WARNING: Image uploaded but verification failed — image may not be accessible at:', result.publicUrl)
    }

    return result.publicUrl
  }

  const handleAcceptImage = async () => {
    if (!previewUrl) return

    setUploading(true)
    setError('')

    try {
      // 1. Download image via server-side proxy (avoids CORS)
      const blob = await fetchImageViaProxy(previewUrl)
      const file = new File([blob], 'ai-generated.png', { type: blob.type || 'image/png' })

      // 2. Process (resize + compress to WebP)
      const context: ImageContext = contentType === 'recipe' ? 'recipes' : 'articles'
      const options = getProcessingOptions(context)
      const processed = await processImage(file, options)

      // 3. Upload to one.com via FTP Edge Function
      const ext = processed.format === 'webp' ? 'webp' : 'jpg'
      const publicUrl = await uploadViaFtp(previewUrl, processed.blob, ext)

      // 4. Clean up and notify parent
      onImageGenerated(publicUrl)

      // Reset state
      setStep('idle')
      setPrompt('')
      setPreviewUrl('')
    } catch (err: any) {
      setError(`Upload fejlede: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  // ── Cancel / Reset ──

  const handleCancel = () => {
    abortRef.current = true
    setStep('idle')
    setPrompt('')
    setPreviewUrl('')
    setError('')
  }

  const handleRetry = () => {
    setPreviewUrl('')
    setError('')
    setStep('editing-prompt')
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className={cn('rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 p-4 space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent" />
        <span className="text-sm font-medium text-accent">AI Billedgenerering</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            {error}
            {error.includes('API key') && (
              <Link to="/admin/settings" className="block mt-1 text-accent hover:underline font-medium">
                → Gå til Indstillinger
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Step: Idle */}
      {step === 'idle' && (
        <button
          type="button"
          onClick={handleGeneratePrompt}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-md bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors"
        >
          <Sparkles className="h-4 w-4" />
          Generer AI-billede
        </button>
      )}

      {/* Step: Generating prompt */}
      {step === 'generating-prompt' && (
        <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="text-sm">Analyserer indhold og genererer billedprompt...</span>
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Annuller
          </button>
        </div>
      )}

      {/* Step: Editing prompt */}
      {step === 'editing-prompt' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-muted-foreground">
              Billedprompt (rediger gerne inden generering)
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              placeholder="Beskriv det ønskede billede..."
            />
          </div>

          <div className="text-[11px] text-muted-foreground">
            Format: {aspectRatio} • Opløsning: 1K • Model: Nanobanana Pro (Gemini 3.0)
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={!prompt.trim()}
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-md bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" />
              Generer billede
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center justify-center gap-1 h-9 px-4 rounded-md border border-input text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Annuller
            </button>
          </div>
        </div>
      )}

      {/* Step: Generating image */}
      {step === 'generating-image' && (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
          <span className="text-sm font-medium">Genererer billede...</span>
          <span className="text-xs">Dette kan tage 10-30 sekunder</span>
          <button
            type="button"
            onClick={handleCancel}
            className="text-xs text-muted-foreground hover:text-foreground underline mt-1"
          >
            Annuller
          </button>
        </div>
      )}

      {/* Step: Preview */}
      {step === 'preview' && previewUrl && (
        <div className="space-y-3">
          <ImagePreviewWithSafeZone
            imageSrc={previewUrl}
            aspectRatio={aspectRatio.replace(':', '/') as '16/9' | '4/3'}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAcceptImage}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 h-9 rounded-md bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploader...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Brug dette billede
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleRetry}
              disabled={uploading}
              className="flex items-center justify-center gap-1 h-9 px-4 rounded-md border border-input text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Generer nyt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
