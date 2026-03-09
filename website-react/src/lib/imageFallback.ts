/**
 * Image fallback utilities.
 *
 * When images are hosted on one.com (shiftingsource.com/images/...),
 * they may become unavailable if CI/CD or hosting issues occur.
 * This module provides a fallback to Supabase Storage backup URLs.
 */

const SITE_IMAGE_PREFIX = 'https://shiftingsource.com/images/'
const SUPABASE_STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/images/`

/**
 * Converts a shiftingsource.com image URL to its Supabase Storage backup URL.
 * Returns null if the URL is not a shiftingsource.com image.
 */
export function getBackupImageUrl(url: string): string | null {
  if (!url || !url.startsWith(SITE_IMAGE_PREFIX)) return null
  const relativePath = url.replace(SITE_IMAGE_PREFIX, '')
  return `${SUPABASE_STORAGE_BASE}${relativePath}`
}

/**
 * onError handler for <img> elements that tries Supabase Storage fallback.
 * If the fallback also fails, hides the image.
 *
 * Usage: <img src={url} onError={handleImageError} />
 */
export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  const currentSrc = img.src

  // Already tried fallback — hide the image
  if (img.dataset.fallbackAttempted === 'true') {
    img.style.display = 'none'
    return
  }

  const backupUrl = getBackupImageUrl(currentSrc)
  if (backupUrl) {
    img.dataset.fallbackAttempted = 'true'
    img.src = backupUrl
  } else {
    img.style.display = 'none'
  }
}
