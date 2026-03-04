import { cn } from '@/lib/utils'
import { formatBytes } from '@/lib/imageProcessing'

interface ImagePreviewWithSafeZoneProps {
  imageSrc: string
  aspectRatio?: '16/9' | '4/3'
  originalSize?: number
  compressedSize?: number
  format?: string
  className?: string
  /** Called when user clicks remove/replace */
  onRemove?: () => void
  onReplace?: () => void
}

/**
 * Image preview with a "safe zone" overlay.
 *
 * The outer 15 % on each edge is dimmed to show what `object-cover` may crop
 * on smaller card views.  The center 70 % is the guaranteed-visible safe zone.
 */
export default function ImagePreviewWithSafeZone({
  imageSrc,
  aspectRatio = '16/9',
  originalSize,
  compressedSize,
  format,
  className,
  onRemove,
  onReplace,
}: ImagePreviewWithSafeZoneProps) {
  const ar = aspectRatio === '4/3' ? 'aspect-[4/3]' : 'aspect-video'

  const compressionPct =
    originalSize && compressedSize
      ? Math.round((1 - compressedSize / originalSize) * 100)
      : null

  return (
    <div className={cn('relative rounded-md overflow-hidden group', ar, className)}>
      {/* The actual image */}
      <img
        src={imageSrc}
        alt="Preview"
        className="h-full w-full object-cover"
      />

      {/* Safe-zone overlay: dims the outer 15 % on each edge */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top strip */}
        <div className="absolute top-0 left-0 right-0 h-[15%] bg-black/35" />
        {/* Bottom strip */}
        <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-black/35" />
        {/* Left strip (between top & bottom) */}
        <div className="absolute top-[15%] bottom-[15%] left-0 w-[15%] bg-black/35" />
        {/* Right strip (between top & bottom) */}
        <div className="absolute top-[15%] bottom-[15%] right-0 w-[15%] bg-black/35" />

        {/* Safe zone border */}
        <div className="absolute top-[15%] left-[15%] right-[15%] bottom-[15%] border border-dashed border-white/60 rounded-sm" />

        {/* Label */}
        <span className="absolute top-[15%] left-1/2 -translate-x-1/2 translate-y-1 text-[10px] font-medium text-white/70 bg-black/40 px-1.5 py-0.5 rounded">
          safe zone
        </span>
      </div>

      {/* Compression stats badge */}
      {compressedSize != null && (
        <div className="absolute bottom-2 left-2 text-[10px] font-mono bg-black/60 text-white px-2 py-1 rounded flex items-center gap-1.5">
          {originalSize != null && (
            <span className="line-through opacity-60">{formatBytes(originalSize)}</span>
          )}
          <span className="font-semibold">{formatBytes(compressedSize)}</span>
          {format && <span className="uppercase opacity-60">{format}</span>}
          {compressionPct != null && (
            <span className="text-emerald-300">−{compressionPct}%</span>
          )}
        </div>
      )}

      {/* Action buttons (visible on hover) */}
      {(onRemove || onReplace) && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onReplace && (
            <button
              type="button"
              onClick={onReplace}
              className="rounded bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80 transition-colors"
            >
              Erstat
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600 transition-colors"
            >
              Fjern
            </button>
          )}
        </div>
      )}
    </div>
  )
}
