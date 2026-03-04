import { useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { processImage, getProcessingOptions, type ImageContext } from '@/lib/imageProcessing'
import ImagePreviewWithSafeZone from '@/components/ImagePreviewWithSafeZone'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  folder?: string
  /** Which processing preset to use (determines dimensions & aspect ratio) */
  imageContext?: ImageContext
  label?: string
  height?: string
  className?: string
}

export default function ImageUploader({
  value,
  onChange,
  folder = 'homepage',
  imageContext = 'homepage',
  label,
  height = 'h-40',
  className,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadingRef = useRef(false)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
    format: string
  } | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (uploadingRef.current) return

    if (!file.type.startsWith('image/')) {
      setError('Kun billedfiler er tilladt')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Billedet skal være under 20 MB (komprimeres automatisk)')
      return
    }

    uploadingRef.current = true
    setProcessing(true)
    setError('')
    setCompressionInfo(null)

    try {
      // 1. Process (resize + compress to WebP)
      const options = getProcessingOptions(imageContext)
      let processed: Awaited<ReturnType<typeof processImage>>

      try {
        processed = await processImage(file, options)
      } catch (procErr) {
        console.warn('[ImageUploader] Processing failed, uploading original:', procErr)
        // Fallback: upload original
        processed = {
          blob: file,
          width: 0,
          height: 0,
          originalSize: file.size,
          compressedSize: file.size,
          format: file.name.split('.').pop() || 'jpg',
          previewUrl: URL.createObjectURL(file),
        }
      }

      setCompressionInfo({
        originalSize: processed.originalSize,
        compressedSize: processed.compressedSize,
        format: processed.format,
      })

      // 2. Upload processed blob to Supabase
      setProcessing(false)
      setUploading(true)

      const ext = processed.format === 'webp' ? 'webp' : 'jpg'
      const timestamp = Date.now()
      const safeName = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .substring(0, 50)
      const filePath = `${folder}/${timestamp}-${safeName}.${ext}`

      const uploadPromise = supabase.storage
        .from('images')
        .upload(filePath, processed.blob, { cacheControl: '3600', upsert: false })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Upload timeout (30s)')), 30000)
      )
      const { data, error: uploadError } = await Promise.race([uploadPromise, timeoutPromise])
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(data.path)
      if (!urlData?.publicUrl) throw new Error('Kunne ikke hente offentlig URL for billedet')

      // Clean up preview URL
      if (processed.previewUrl) URL.revokeObjectURL(processed.previewUrl)

      onChange(urlData.publicUrl)
    } catch (err: any) {
      setError(`Upload fejlede: ${err.message}`)
    } finally {
      setUploading(false)
      setProcessing(false)
      uploadingRef.current = false
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const aspectRatio = imageContext === 'recipes' ? '4/3' as const : '16/9' as const

  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="block text-xs font-medium mb-1">{label}</label>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />

      {value ? (
        <ImagePreviewWithSafeZone
          imageSrc={value}
          aspectRatio={aspectRatio}
          originalSize={compressionInfo?.originalSize}
          compressedSize={compressionInfo?.compressedSize}
          format={compressionInfo?.format}
          onReplace={() => fileInputRef.current?.click()}
          onRemove={() => { onChange(''); setCompressionInfo(null) }}
        />
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || processing}
          className={cn(
            'w-full rounded-md border-2 border-dashed border-input hover:border-primary/50 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground',
            height
          )}
        >
          {processing ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Forbereder billede...</span>
            </>
          ) : uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Uploader...</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />
              <span className="text-sm">Klik for at uploade billede</span>
              <span className="text-xs">Resizes automatisk — JPG, PNG, WebP</span>
            </>
          )}
        </button>
      )}

      {/* Manual URL fallback */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Eller indsæt billede-URL manuelt"
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
