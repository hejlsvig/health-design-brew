/**
 * VideoUploader — Upload explainer videos per language (da/en/se)
 * Uploads to one.com /videos/ folder via the upload-image-ftp edge function.
 * Prepared for future AI video generation integration.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Video, Upload, Trash2, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface VideoUploaderProps {
  /** Current video URLs per language: { da: "url", en: "url", se: "url" } */
  videoUrl: Record<string, string> | null
  /** Callback when video URLs change */
  onChange: (videoUrl: Record<string, string> | null, videoType: string) => void
  /** Optional article slug for filename generation */
  articleSlug?: string
}

const LANGS = [
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'se', label: 'Svenska', flag: '🇸🇪' },
]

const MAX_VIDEO_SIZE_MB = 100
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export default function VideoUploader({ videoUrl, onChange, articleSlug }: VideoUploaderProps) {
  const { t } = useTranslation()
  const [activeLang, setActiveLang] = useState('da')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const currentUrls = videoUrl || {}

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(t('admin.video.invalidType', 'Kun MP4, WebM og MOV filer er tilladt'))
      return
    }

    // Validate size
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setError(t('admin.video.tooLarge', `Video må max være ${MAX_VIDEO_SIZE_MB} MB`))
      return
    }

    setUploading(true)
    setProgress(t('admin.video.preparing', 'Forbereder video...'))

    try {
      // Read file as base64
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      let binary = ''
      // Process in chunks to avoid call stack issues with large files
      const chunkSize = 8192
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize)
        for (let j = 0; j < chunk.length; j++) {
          binary += String.fromCharCode(chunk[j])
        }
      }
      const videoBase64 = btoa(binary)

      // Build filename
      const ext = file.type.includes('webm') ? 'webm' : file.type.includes('quicktime') ? 'mov' : 'mp4'
      const slugPart = articleSlug ? articleSlug.slice(0, 40) : 'article'
      const filename = `${slugPart}-${activeLang}-${Date.now()}.${ext}`

      setProgress(t('admin.video.uploading', 'Uploader video til server...'))

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Ikke logget ind — log ud og ind igen')
      }

      // Upload via edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/upload-image-ftp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          videoBase64,
          videoContentType: file.type,
          folder: 'videos',
          filename,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Upload fejlede (${response.status})`)
      }

      // Update URLs
      const newUrls = { ...currentUrls, [activeLang]: result.publicUrl }
      onChange(newUrls, 'upload')

      setProgress('')
    } catch (err: any) {
      setError(err.message || 'Upload fejlede')
    } finally {
      setUploading(false)
      setProgress('')
    }

    // Reset input
    e.target.value = ''
  }

  const handleRemove = (lang: string) => {
    const newUrls = { ...currentUrls }
    delete newUrls[lang]
    const hasAny = Object.values(newUrls).some(v => v)
    onChange(hasAny ? newUrls : null, hasAny ? 'upload' : 'none')
  }

  const videoCount = Object.values(currentUrls).filter(Boolean).length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Video className="h-4 w-4 text-accent" />
        <span className="text-sm font-bold">
          {t('admin.video.title', 'Explainer Video')}
        </span>
        {videoCount > 0 && (
          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
            {videoCount}/3 {t('admin.video.languages', 'sprog')}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t('admin.video.description', 'Upload en explainer-video per sprog. Vises øverst i artiklen. Max 100 MB per video.')}
      </p>

      {/* Language tabs */}
      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {LANGS.map(l => (
          <button
            key={l.code}
            onClick={() => setActiveLang(l.code)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeLang === l.code
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {l.flag} {l.label}
            {currentUrls[l.code] && ' ✓'}
          </button>
        ))}
      </div>

      {/* Current video preview or upload area */}
      {currentUrls[activeLang] ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-lg border bg-black">
            <video
              src={currentUrls[activeLang]}
              controls
              preload="metadata"
              className="w-full max-h-[300px]"
            >
              {t('admin.video.notSupported', 'Din browser understøtter ikke video-afspilning.')}
            </video>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground truncate max-w-[70%]">
              {currentUrls[activeLang].split('/').pop()}
            </span>
            <button
              onClick={() => handleRemove(activeLang)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3 w-3" />
              {t('common.delete', 'Slet')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Upload area */}
          <label className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
            uploading
              ? 'border-accent/50 bg-accent/5'
              : 'border-border hover:border-accent hover:bg-accent/5'
          )}>
            {uploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="mt-2 text-sm text-muted-foreground">{progress}</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('admin.video.uploadPrompt', 'Klik for at uploade video')}
                </p>
                <p className="text-xs text-muted-foreground/60">MP4, WebM — max {MAX_VIDEO_SIZE_MB} MB</p>
              </>
            )}
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={handleFileSelect}
              disabled={uploading}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>

          {/* AI generate placeholder (future) */}
          <button
            disabled
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground/50 cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4" />
            {t('admin.video.aiGenerate', 'AI Video Generator — kommer snart')}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}
