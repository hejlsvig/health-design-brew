import { useTranslation } from 'react-i18next'
import { type SubscriptionTier, TIER_CONFIG } from '@/lib/featureGating'
import { Lock, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import FeatureGateModal from './FeatureGateModal'

interface Props {
  featureKey: string
  requiredTier: SubscriptionTier | null
  /** Optional: render children behind a blurred overlay instead of replacing with prompt */
  overlay?: boolean
  children?: React.ReactNode
}

/**
 * Wraps content that requires a higher subscription tier.
 * Shows a prompt to upgrade if the user doesn't have access.
 *
 * Usage:
 *   const access = useFeatureGate('ai_meal_plans')
 *   if (!access.hasAccess) return <UpgradePrompt featureKey="ai_meal_plans" requiredTier={access.requiredTier} />
 *
 * Or as an overlay wrapper:
 *   <UpgradePrompt featureKey="ai_chat" requiredTier="pro" overlay>
 *     <ChatWidget />
 *   </UpgradePrompt>
 */
export default function UpgradePrompt({ featureKey, requiredTier, overlay, children }: Props) {
  const { t } = useTranslation()
  const [showModal, setShowModal] = useState(false)

  const tierConfig = requiredTier ? TIER_CONFIG[requiredTier] : null
  const tierLabel = tierConfig?.label || 'Premium'

  const promptContent = (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
        <Lock className="w-7 h-7 text-amber-600" />
      </div>
      <div>
        <h3 className="text-lg font-serif text-foreground mb-1">
          {t('upgrade.title', { tier: tierLabel })}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('upgrade.description', { feature: featureKey.replace(/_/g, ' '), tier: tierLabel })}
        </p>
      </div>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-600 text-white font-medium text-sm hover:bg-amber-700 transition-colors"
      >
        {t('upgrade.cta', { tier: tierLabel })}
        <ArrowRight className="w-4 h-4" />
      </button>

      {showModal && (
        <FeatureGateModal
          featureKey={featureKey}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )

  if (overlay && children) {
    return (
      <div className="relative">
        <div className="blur-sm pointer-events-none select-none opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
          {promptContent}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {promptContent}
    </div>
  )
}
