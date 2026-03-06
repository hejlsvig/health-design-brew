import { useTranslation } from 'react-i18next'
import { type SubscriptionTier, TIER_CONFIG, FEATURES } from '@/lib/featureGating'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { X, Check, Star, Crown, Zap } from 'lucide-react'

interface Props {
  featureKey: string
  onClose: () => void
}

const TIER_ICON: Record<SubscriptionTier, typeof Star> = {
  free: Star,
  premium: Crown,
  pro: Zap,
}

// Features grouped by what each tier unlocks
const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  free: [
    FEATURES.BASIC_CALCULATOR,
    FEATURES.BROWSE_RECIPES,
    FEATURES.BLOG_ACCESS,
  ],
  premium: [
    FEATURES.ADVANCED_MACROS,
    FEATURES.UNLIMITED_FAVORITES,
    FEATURES.AI_MEAL_PLANS,
    FEATURES.MEAL_PLAN_HISTORY,
    FEATURES.RESEARCH_GUIDES,
    FEATURES.DATA_EXPORT,
  ],
  pro: [
    FEATURES.AI_CHAT,
    FEATURES.AI_IMAGE_GENERATION,
    FEATURES.COACHING_ACCESS,
    FEATURES.COACHING_CHECKINS,
    FEATURES.MONTHLY_MEAL_PLANS,
  ],
}

/**
 * Modal showing tier comparison and upgrade options.
 * Stripe checkout will be integrated here when ready.
 */
export default function FeatureGateModal({ featureKey, onClose }: Props) {
  const { t } = useTranslation()
  const { tier: currentTier } = useSubscription()

  const tiers: SubscriptionTier[] = ['free', 'premium', 'pro']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-serif text-foreground">{t('upgrade.modalTitle')}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('upgrade.modalSubtitle')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tier comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {tiers.map((tier) => {
            const config = TIER_CONFIG[tier]
            const Icon = TIER_ICON[tier]
            const isCurrent = tier === currentTier
            const features = TIER_FEATURES[tier]

            return (
              <div
                key={tier}
                className={`rounded-xl border-2 p-5 transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : tier === 'premium'
                    ? 'border-amber-300 bg-amber-50/50'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`w-5 h-5 ${config.color}`} />
                  <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
                  {isCurrent && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      {t('upgrade.current')}
                    </span>
                  )}
                </div>

                {/* Price placeholder */}
                <div className="mb-4">
                  <p className="text-2xl font-bold text-foreground">
                    {tier === 'free' ? t('upgrade.free') : tier === 'premium' ? '99 kr' : '199 kr'}
                  </p>
                  {tier !== 'free' && (
                    <p className="text-xs text-muted-foreground">{t('upgrade.perMonth')}</p>
                  )}
                </div>

                {/* Feature list */}
                <ul className="space-y-2 mb-5">
                  {features.map((fk) => {
                    const isHighlighted = fk === featureKey
                    return (
                      <li
                        key={fk}
                        className={`flex items-start gap-2 text-sm ${
                          isHighlighted ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isHighlighted ? 'text-green-500' : 'text-green-400'}`} />
                        <span>{fk.replace(/_/g, ' ')}</span>
                      </li>
                    )
                  })}
                </ul>

                {/* CTA button */}
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium"
                  >
                    {t('upgrade.currentPlan')}
                  </button>
                ) : tier === 'free' ? null : (
                  <button
                    className={`w-full py-2.5 rounded-lg text-white text-sm font-medium transition-colors ${
                      tier === 'premium'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}
                    onClick={() => {
                      // TODO: Integrate with Stripe Checkout
                      // Will redirect to Stripe Checkout session
                      console.log(`Upgrade to ${tier} — Stripe integration pending`)
                    }}
                  >
                    {t('upgrade.upgradeTo', { tier: config.label })}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-6">
          <p className="text-xs text-muted-foreground text-center">
            {t('upgrade.stripeNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
