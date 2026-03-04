/**
 * Analytics integration — Plausible Analytics (privacy-friendly, GDPR-compliant).
 *
 * Plausible is cookie-free by default, but we still gate it behind the
 * "analytics" consent toggle so the user has full control.
 *
 * Usage:
 *   - Call `initAnalytics()` once on app mount.
 *   - It listens for `ss-consent-change` events from CookieConsentContext.
 *   - When analytics consent is granted, it dynamically injects the Plausible script.
 *   - The domain is configurable via admin_settings or falls back to the current hostname.
 */

const PLAUSIBLE_SRC = 'https://plausible.io/js/script.js'
let scriptInjected = false

/**
 * Inject the Plausible script tag into <head>.
 */
function injectPlausible(domain: string) {
  if (scriptInjected) return
  if (typeof document === 'undefined') return

  const script = document.createElement('script')
  script.defer = true
  script.dataset.domain = domain
  script.src = PLAUSIBLE_SRC
  document.head.appendChild(script)
  scriptInjected = true

  console.log(`[Analytics] Plausible loaded for domain: ${domain}`)
}

/**
 * Remove Plausible script (if consent is revoked).
 */
function removePlausible() {
  if (!scriptInjected) return
  const existing = document.querySelector(`script[src="${PLAUSIBLE_SRC}"]`)
  if (existing) existing.remove()
  scriptInjected = false
  console.log('[Analytics] Plausible removed')
}

/**
 * Initialize analytics — call once from Layout or App.
 * Checks consent state immediately and listens for changes.
 */
export function initAnalytics(domain?: string) {
  const siteDomain = domain || window.location.hostname

  // Check initial consent
  const hasConsent = window.ShiftingSource?.hasConsent?.('analytics')
  if (hasConsent) {
    injectPlausible(siteDomain)
  }

  // Listen for consent changes
  window.addEventListener('ss-consent-change', ((e: CustomEvent) => {
    if (e.detail?.analytics) {
      injectPlausible(siteDomain)
    } else {
      removePlausible()
    }
  }) as EventListener)
}

/**
 * Track a custom event (if Plausible is loaded).
 * @see https://plausible.io/docs/custom-event-goals
 */
export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (typeof window !== 'undefined' && (window as any).plausible) {
    ;(window as any).plausible(name, { props })
  }
}
