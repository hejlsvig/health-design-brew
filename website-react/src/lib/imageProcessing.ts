/**
 * Client-side image processing: resize, center-crop, and WebP compression.
 * Uses the native Canvas API — zero external dependencies.
 */

// ── Types ──────────────────────────────────────────────────────────

export type ImageContext = 'articles' | 'recipes' | 'guides' | 'homepage'

export interface ProcessingOptions {
  targetWidth: number
  targetHeight: number
  quality: number   // 0–1
  format: 'webp' | 'jpeg'
}

export interface ProcessedImage {
  blob: Blob
  width: number
  height: number
  originalSize: number
  compressedSize: number
  format: string
  /** Data-URL for instant preview without another network request */
  previewUrl: string
}

// ── Presets ─────────────────────────────────────────────────────────

const PRESETS: Record<ImageContext, ProcessingOptions> = {
  articles:  { targetWidth: 1200, targetHeight: 675,  quality: 0.82, format: 'webp' },
  recipes:   { targetWidth: 1200, targetHeight: 900,  quality: 0.82, format: 'webp' },
  guides:    { targetWidth: 1200, targetHeight: 675,  quality: 0.82, format: 'webp' },
  homepage:  { targetWidth: 1200, targetHeight: 675,  quality: 0.82, format: 'webp' },
}

export function getProcessingOptions(context: ImageContext): ProcessingOptions {
  return { ...PRESETS[context] }
}

// ── Helpers ─────────────────────────────────────────────────────────

/** Load a File into an HTMLImageElement */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image file'))
    }
    img.src = url
  })
}

/** Check if the browser supports WebP encoding via Canvas */
function supportsWebP(): boolean {
  try {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    return c.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

/** Convert a canvas to a Blob, with automatic JPEG fallback */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  preferredFormat: 'webp' | 'jpeg',
  quality: number,
): Promise<{ blob: Blob; format: string }> {
  const useWebP = preferredFormat === 'webp' && supportsWebP()
  const mimeType = useWebP ? 'image/webp' : 'image/jpeg'
  const format = useWebP ? 'webp' : 'jpeg'

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas toBlob returned null'))
        resolve({ blob, format })
      },
      mimeType,
      quality,
    )
  })
}

// ── Main ────────────────────────────────────────────────────────────

/**
 * Resize + center-crop + compress an image file.
 *
 * 1. Loads the file into an off-screen Image element.
 * 2. Computes a center-crop rectangle that matches the target aspect ratio.
 * 3. Draws the cropped region onto a Canvas at the target dimensions.
 * 4. Exports as WebP (with JPEG fallback).
 */
export async function processImage(
  file: File,
  options: ProcessingOptions,
): Promise<ProcessedImage> {
  const { targetWidth, targetHeight, quality, format } = options
  const targetAspect = targetWidth / targetHeight

  // 1. Load the source image
  const img = await loadImage(file)
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  const srcAspect = srcW / srcH

  // 2. Calculate center-crop rectangle
  let cropX = 0
  let cropY = 0
  let cropW = srcW
  let cropH = srcH

  if (srcAspect > targetAspect) {
    // Source is wider → crop sides
    cropW = Math.round(srcH * targetAspect)
    cropX = Math.round((srcW - cropW) / 2)
  } else if (srcAspect < targetAspect) {
    // Source is taller → crop top/bottom
    cropH = Math.round(srcW / targetAspect)
    cropY = Math.round((srcH - cropH) / 2)
  }

  // 3. Draw onto canvas at target dimensions
  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D context')

  // Use high-quality resampling
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetWidth, targetHeight)

  // 4. Export as compressed blob
  const { blob, format: actualFormat } = await canvasToBlob(canvas, format, quality)

  // 5. Generate a preview URL the caller can use immediately
  const previewUrl = URL.createObjectURL(blob)

  return {
    blob,
    width: targetWidth,
    height: targetHeight,
    originalSize: file.size,
    compressedSize: blob.size,
    format: actualFormat,
    previewUrl,
  }
}

// ── Utility: human-readable file size ──────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
