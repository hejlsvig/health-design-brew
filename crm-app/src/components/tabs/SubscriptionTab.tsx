import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  type Subscription,
  type SubscriptionTier,
  updateSubscriptionTier,
  updateSubscriptionStatus,
  type SubscriptionStatus,
} from '@/lib/subscriptions'
import { CreditCard, Crown, Zap, Star, CalendarDays, AlertCircle } from 'lucide-react'

const TIERS: SubscriptionTier[] = ['free', 'premium', 'pro']
const STATUSES: SubscriptionStatus[] = ['active', 'past_due', 'cancelled', 'trialing']

const TIER_ICONS: Record<SubscriptionTier, typeof Star> = {
  free: Star,
  premium: Crown,
  pro: Zap,
}

const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: 'bg-gray-100 text-gray-700',
  premium: 'bg-amber-100 text-amber-700',
  pro: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  active: 'bg-green-100 text-green-700',
  trialing: 'bg-blue-100 text-blue-700',
  past_due: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

interface Props {
  subscription: Subscription | null
  profileId: string
  onUpdate: () => void
}

export default function SubscriptionTab({ subscription, profileId, onUpdate }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)

  if (!subscription) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <AlertCircle className="w-8 h-8" />
        <p>{t('subscription.noSubscription')}</p>
      </div>
    )
  }

  const TierIcon = TIER_ICONS[subscription.tier]

  async function handleTierChange(newTier: SubscriptionTier) {
    setSaving(true)
    try {
      await updateSubscriptionTier(profileId, newTier, user?.id)
      onUpdate()
    } catch (err) {
      console.error('Tier change error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(newStatus: SubscriptionStatus) {
    setSaving(true)
    try {
      await updateSubscriptionStatus(profileId, newStatus)
      onUpdate()
    } catch (err) {
      console.error('Status change error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Current tier badge */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
        <div className={`p-3 rounded-xl ${TIER_COLORS[subscription.tier]}`}>
          <TierIcon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {t('subscription.currentTier')}
          </p>
          <p className="text-lg font-serif font-semibold text-foreground capitalize">
            {subscription.tier}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[subscription.status]}`}>
          {t(`subscription.status.${subscription.status}`)}
        </span>
      </div>

      {/* Tier selection */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
          {t('subscription.changeTier')}
        </label>
        <div className="grid grid-cols-3 gap-3">
          {TIERS.map((tier) => {
            const Icon = TIER_ICONS[tier]
            const isActive = subscription.tier === tier
            return (
              <button
                key={tier}
                onClick={() => handleTierChange(tier)}
                disabled={saving || isActive}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 bg-card'
                } disabled:opacity-50`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium capitalize ${isActive ? 'text-primary' : 'text-foreground'}`}>
                  {tier}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Status dropdown */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
          {t('subscription.changeStatus')}
        </label>
        <select
          value={subscription.status}
          onChange={(e) => handleStatusChange(e.target.value as SubscriptionStatus)}
          disabled={saving}
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{t(`subscription.status.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Stripe info */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
          <CreditCard className="w-3.5 h-3.5 inline mr-1" />
          Stripe
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoField label="Customer ID" value={subscription.stripe_customer_id} />
          <InfoField label="Subscription ID" value={subscription.stripe_subscription_id} />
          <InfoField label="Price ID" value={subscription.stripe_price_id} />
          <InfoField
            label={t('subscription.cancelAtEnd')}
            value={subscription.cancel_at_period_end ? t('common.yes') : t('common.no')}
          />
        </div>
      </div>

      {/* Period dates */}
      {(subscription.current_period_start || subscription.current_period_end) && (
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
            <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
            {t('subscription.period')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <InfoField
              label={t('subscription.periodStart')}
              value={subscription.current_period_start
                ? new Date(subscription.current_period_start).toLocaleDateString()
                : null}
            />
            <InfoField
              label={t('subscription.periodEnd')}
              value={subscription.current_period_end
                ? new Date(subscription.current_period_end).toLocaleDateString()
                : null}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-mono text-foreground truncate">{value || '—'}</p>
    </div>
  )
}
