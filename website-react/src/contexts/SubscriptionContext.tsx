import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import {
  fetchUserSubscription,
  fetchAllFeatureGates,
  checkFeatureAccess,
  type Subscription,
  type SubscriptionTier,
  type FeatureGate,
  type FeatureAccess,
} from '@/lib/featureGating'
import { useAuth } from './AuthContext'

// ─── Context type ───

interface SubscriptionContextType {
  subscription: Subscription | null
  tier: SubscriptionTier
  gates: FeatureGate[]
  loading: boolean
  checkFeature: (featureKey: string) => FeatureAccess
  refresh: () => Promise<void>
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

// ─── Provider ───

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [gates, setGates] = useState<FeatureGate[]>([])
  const [loading, setLoading] = useState(true)

  const tier: SubscriptionTier = subscription?.tier ?? 'free'

  const loadData = useCallback(async () => {
    if (!user) {
      setSubscription(null)
      setGates([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [sub, allGates] = await Promise.all([
        fetchUserSubscription(user.id),
        fetchAllFeatureGates(),
      ])
      setSubscription(sub)
      setGates(allGates)
    } catch (err) {
      console.error('SubscriptionContext load error:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const checkFeature = useCallback(
    (featureKey: string): FeatureAccess => {
      return checkFeatureAccess(featureKey, tier, gates)
    },
    [tier, gates]
  )

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        tier,
        gates,
        loading,
        checkFeature,
        refresh: loadData,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  )
}

// ─── Hook ───

export function useSubscription() {
  const ctx = useContext(SubscriptionContext)
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider')
  return ctx
}

/**
 * Convenience hook: check if the user has access to a specific feature.
 *
 * Usage:
 *   const { hasAccess, requiredTier } = useFeatureGate('ai_meal_plans')
 *   if (!hasAccess) return <UpgradePrompt requiredTier={requiredTier} />
 */
export function useFeatureGate(featureKey: string): FeatureAccess {
  const { checkFeature } = useSubscription()
  return checkFeature(featureKey)
}
