import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCookieConsent } from '@/contexts/CookieConsentContext'
import { Cookie, ChevronDown, ChevronUp, Shield, BarChart3, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'

export default function CookieBanner() {
  const { t } = useTranslation()
  const { isVisible, showSettings, acceptAll, acceptNecessary, saveCustom, openSettings, closeSettings } = useCookieConsent()

  const [analyticsChecked, setAnalyticsChecked] = useState(false)
  const [marketingChecked, setMarketingChecked] = useState(false)

  if (!isVisible) return null

  const handleSaveCustom = () => {
    saveCustom(analyticsChecked, marketingChecked)
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'transition-transform duration-300 ease-out',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="bg-charcoal text-charcoal-foreground shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-5">

          {/* ── Main banner ── */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Cookie className="w-5 h-5 mt-0.5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-serif font-bold text-base sm:text-lg leading-tight">
                  {t('cookieConsent.title')}
                </h3>
                <p className="text-sm text-charcoal-foreground/70 mt-1 leading-relaxed">
                  {t('cookieConsent.description')}{' '}
                  <Link to="/privacy" className="text-accent hover:text-accent/80 underline transition-colors">
                    {t('cookieConsent.privacyLink')}
                  </Link>.
                </p>
              </div>
            </div>

            {/* ── Button row ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                onClick={acceptAll}
                className="px-5 py-2.5 rounded-md bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors"
              >
                {t('cookieConsent.acceptAll')}
              </button>
              <button
                onClick={acceptNecessary}
                className="px-5 py-2.5 rounded-md border border-charcoal-foreground/30 text-charcoal-foreground font-medium text-sm hover:bg-charcoal-foreground/10 transition-colors"
              >
                {t('cookieConsent.acceptNecessary')}
              </button>
              <button
                onClick={showSettings ? closeSettings : openSettings}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-accent text-sm hover:text-accent/80 transition-colors"
              >
                {t('cookieConsent.settings')}
                {showSettings
                  ? <ChevronUp className="w-4 h-4" />
                  : <ChevronDown className="w-4 h-4" />
                }
              </button>
            </div>
          </div>

          {/* ── Settings panel ── */}
          <div
            className={cn(
              'overflow-hidden transition-all duration-300 ease-out',
              showSettings ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
            )}
          >
            <div className="border-t border-charcoal-foreground/15 pt-4">
              <h4 className="font-serif font-bold text-sm mb-1">
                {t('cookieConsent.settingsTitle')}
              </h4>
              <p className="text-xs text-charcoal-foreground/60 mb-4">
                {t('cookieConsent.settingsSubtitle')}
              </p>

              <div className="space-y-3">
                {/* Necessary — always on */}
                <ConsentRow
                  icon={<Shield className="w-4 h-4" />}
                  title={t('cookieConsent.necessary')}
                  description={t('cookieConsent.necessaryDesc')}
                  checked={true}
                  disabled={true}
                  badge={t('cookieConsent.alwaysActive')}
                />

                {/* Analytics */}
                <ConsentRow
                  icon={<BarChart3 className="w-4 h-4" />}
                  title={t('cookieConsent.analytics')}
                  description={t('cookieConsent.analyticsDesc')}
                  checked={analyticsChecked}
                  onChange={setAnalyticsChecked}
                />

                {/* Marketing */}
                <ConsentRow
                  icon={<Megaphone className="w-4 h-4" />}
                  title={t('cookieConsent.marketing')}
                  description={t('cookieConsent.marketingDesc')}
                  checked={marketingChecked}
                  onChange={setMarketingChecked}
                />
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSaveCustom}
                  className="px-5 py-2 rounded-md bg-accent text-accent-foreground font-semibold text-sm hover:bg-accent/90 transition-colors"
                >
                  {t('cookieConsent.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Consent row component ────────────────────────────────────
interface ConsentRowProps {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  badge?: string
  onChange?: (value: boolean) => void
}

function ConsentRow({ icon, title, description, checked, disabled, badge, onChange }: ConsentRowProps) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-charcoal-foreground/5">
      <div className="text-accent mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{title}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-charcoal-foreground/60 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
          className="sr-only peer"
        />
        <div
          className={cn(
            'w-9 h-5 rounded-full transition-colors',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50',
            'after:content-[\'\'] after:absolute after:top-0.5 after:left-0.5',
            'after:w-4 after:h-4 after:rounded-full after:transition-transform',
            'after:bg-white',
            checked
              ? 'bg-accent after:translate-x-4'
              : 'bg-charcoal-foreground/25 after:translate-x-0',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        />
      </label>
    </div>
  )
}
