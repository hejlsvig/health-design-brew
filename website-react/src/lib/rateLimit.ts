/**
 * Client-side rate limiter
 * Forhindrer spam ved at begrænse antal requests per tidsvindue.
 * Bruges på formularer, API-kald og andre bruger-handlinger.
 *
 * Default-værdier kan overskrives fra admin_settings:
 *   rate_limit_max_requests (default: 5)
 *   rate_limit_window_seconds (default: 60)
 */

import { getSettings } from './openai'

interface RateLimitEntry {
  count: number
  firstRequest: number
}

const store = new Map<string, RateLimitEntry>()

// Cached config fra database
let _configLoaded = false
let _defaultMax = 5
let _defaultWindowMs = 60_000

async function loadConfig() {
  if (_configLoaded) return
  try {
    const s = await getSettings()
    if (s.rate_limit_max_requests) _defaultMax = parseInt(s.rate_limit_max_requests, 10) || 5
    if (s.rate_limit_window_seconds) _defaultWindowMs = (parseInt(s.rate_limit_window_seconds, 10) || 60) * 1000
    _configLoaded = true
  } catch {
    // Brug defaults ved fejl
  }
}

// Init config i baggrunden
loadConfig()

/**
 * Tjek om en handling er rate-limited
 * @param key - Unik nøgle (fx 'newsletter-signup', 'contact-form')
 * @param maxRequests - Max antal requests i tidsvinduet (default fra Settings)
 * @param windowMs - Tidsvindue i millisekunder (default fra Settings)
 * @returns true hvis handlingen er tilladt, false hvis rate-limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = _defaultMax,
  windowMs: number = _defaultWindowMs
): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.firstRequest > windowMs) {
    store.set(key, { count: 1, firstRequest: now })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

/**
 * Hent resterende tid før rate limit udløber (i sekunder)
 */
export function getRateLimitReset(key: string, windowMs: number = _defaultWindowMs): number {
  const entry = store.get(key)
  if (!entry) return 0
  const elapsed = Date.now() - entry.firstRequest
  return Math.max(0, Math.ceil((windowMs - elapsed) / 1000))
}

/**
 * Rate limit decorator der returnerer { allowed, retryAfter }
 */
export function rateLimit(
  key: string,
  maxRequests: number = _defaultMax,
  windowMs: number = _defaultWindowMs
): { allowed: boolean; retryAfter: number } {
  const allowed = checkRateLimit(key, maxRequests, windowMs)
  const retryAfter = allowed ? 0 : getRateLimitReset(key, windowMs)
  return { allowed, retryAfter }
}
