import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ──────────────────────────────────────────────────────
export type ConsentCategory = 'analytics' | 'marketing'

interface ConsentState {
  version: number
  timestamp: string
  necessary: true
  analytics: boolean
  marketing: boolean
}

interface CookieConsentContextType {
  consent: ConsentState | null
  isVisible: boolean
  showSettings: boolean
  acceptAll: () => void
  acceptNecessary: () => void
  saveCustom: (analytics: boolean, marketing: boolean) => void
  openSettings: () => void
  closeSettings: () => void
  reopenBanner: () => void
  hasConsent: (category: ConsentCategory) => boolean
}

const STORAGE_KEY = 'ss_cookie_consent'
const BANNER_DELAY = 500

const defaultContext: CookieConsentContextType = {
  consent: null,
  isVisible: false,
  showSettings: false,
  acceptAll: () => {},
  acceptNecessary: () => {},
  saveCustom: () => {},
  openSettings: () => {},
  closeSettings: () => {},
  reopenBanner: () => {},
  hasConsent: () => false,
}

const CookieConsentContext = createContext<CookieConsentContextType>(defaultContext)

// ─── Global window API for script-blocking ──────────────────────
declare global {
  interface Window {
    ShiftingSource?: {
      hasConsent: (category: ConsentCategory) => boolean
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────
function loadConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version === 1) return parsed as ConsentState
    return null
  } catch {
    return null
  }
}

function saveConsent(state: ConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function buildState(analytics: boolean, marketing: boolean): ConsentState {
  return {
    version: 1,
    timestamp: new Date().toISOString(),
    necessary: true,
    analytics,
    marketing,
  }
}

// ─── Provider ───────────────────────────────────────────────────
export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<ConsentState | null>(() => loadConsent())
  const [isVisible, setIsVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Show banner after delay if no consent stored
  useEffect(() => {
    if (consent) return
    const timer = setTimeout(() => setIsVisible(true), BANNER_DELAY)
    return () => clearTimeout(timer)
  }, [consent])

  // Sync window API whenever consent changes
  useEffect(() => {
    window.ShiftingSource = {
      hasConsent: (category: ConsentCategory) => {
        if (!consent) return false
        return consent[category] === true
      },
    }
  }, [consent])

  // Log to Supabase for authenticated users
  const logConsent = useCallback(async (state: ConsentState, source: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const categories: ConsentCategory[] = ['analytics', 'marketing']
      const logs = categories.map(cat => ({
        user_id: user.id,
        consent_type: `cookie_${cat}`,
        granted: state[cat],
        source,
        created_at: state.timestamp,
      }))

      await supabase.from('consent_log').insert(logs).then(() => {}, () => {})
    } catch {
      // Silent — consent logging is non-critical
    }
  }, [])

  // Dispatch custom event for script-blocking listeners
  const dispatchChange = useCallback((state: ConsentState) => {
    window.dispatchEvent(new CustomEvent('ss-consent-change', {
      detail: { analytics: state.analytics, marketing: state.marketing },
    }))
  }, [])

  const persist = useCallback((state: ConsentState, source: string) => {
    saveConsent(state)
    setConsent(state)
    setIsVisible(false)
    setShowSettings(false)
    dispatchChange(state)
    logConsent(state, source)
  }, [dispatchChange, logConsent])

  const acceptAll = useCallback(() => {
    persist(buildState(true, true), 'banner_accept_all')
  }, [persist])

  const acceptNecessary = useCallback(() => {
    persist(buildState(false, false), 'banner_necessary_only')
  }, [persist])

  const saveCustom = useCallback((analytics: boolean, marketing: boolean) => {
    persist(buildState(analytics, marketing), 'banner_custom')
  }, [persist])

  const openSettings = useCallback(() => setShowSettings(true), [])
  const closeSettings = useCallback(() => setShowSettings(false), [])

  const reopenBanner = useCallback(() => {
    setIsVisible(true)
    setShowSettings(false)
  }, [])

  const hasConsent = useCallback((category: ConsentCategory): boolean => {
    if (!consent) return false
    return consent[category] === true
  }, [consent])

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        isVisible,
        showSettings,
        acceptAll,
        acceptNecessary,
        saveCustom,
        openSettings,
        closeSettings,
        reopenBanner,
        hasConsent,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used within CookieConsentProvider')
  return ctx
}

export default CookieConsentContext
