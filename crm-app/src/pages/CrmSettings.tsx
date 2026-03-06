import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { fetchFeatureGates, updateFeatureGate, type FeatureGate, type SubscriptionTier } from '@/lib/subscriptions'
import { Loader2, Settings, Shield, Check, X as XIcon } from 'lucide-react'

const TIERS: SubscriptionTier[] = ['free', 'premium', 'pro']

export default function CrmSettings() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'general' | 'features' | 'health'>('general')
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [featureGates, setFeatureGates] = useState<FeatureGate[]>([])
  const [healthChecks, setHealthChecks] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [settingsResult, gates, healthResult] = await Promise.all([
        supabase.from('admin_settings').select('key, value').order('key'),
        fetchFeatureGates(),
        supabase.from('health_checks').select('*').order('run_at', { ascending: false }).limit(5),
      ])

      const settingsMap: Record<string, string> = {}
      for (const row of settingsResult.data || []) {
        settingsMap[row.key] = row.value || ''
      }
      setSettings(settingsMap)
      setFeatureGates(gates)
      setHealthChecks((healthResult.data || []) as Record<string, unknown>[])
    } catch (err) {
      console.error('Load settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleGate(featureKey: string, tier: SubscriptionTier, currentEnabled: boolean) {
    try {
      await updateFeatureGate(featureKey, tier, !currentEnabled)
      setFeatureGates((prev) =>
        prev.map((g) =>
          g.feature_key === featureKey && g.tier === tier
            ? { ...g, is_enabled: !currentEnabled }
            : g
        )
      )
    } catch (err) {
      console.error('Toggle gate error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // Group feature gates by feature_key
  const featureKeys = [...new Set(featureGates.map((g) => g.feature_key))]
  const gateMap: Record<string, Record<string, FeatureGate>> = {}
  for (const gate of featureGates) {
    if (!gateMap[gate.feature_key]) gateMap[gate.feature_key] = {}
    gateMap[gate.feature_key][gate.tier] = gate
  }

  // Group settings by prefix
  const settingGroups: Record<string, [string, string][]> = {}
  for (const [key, value] of Object.entries(settings)) {
    const prefix = key.split('_')[0] || 'other'
    if (!settingGroups[prefix]) settingGroups[prefix] = []
    settingGroups[prefix].push([key, value])
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-foreground mb-6">
        <Settings className="w-6 h-6 inline mr-2" />
        {t('crmSettings.title')}
      </h1>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-6">
        {(['general', 'features', 'health'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`crmSettings.tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="space-y-6">
          {Object.entries(settingGroups).map(([prefix, entries]) => (
            <div key={prefix} className="bg-card rounded-xl border border-border p-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {prefix}
              </h3>
              <div className="space-y-2">
                {entries.map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <span className="text-xs font-mono text-muted-foreground w-1/3 truncate">{key}</span>
                    <span className="text-sm text-foreground flex-1 truncate">
                      {key.includes('key') || key.includes('secret') || key.includes('password')
                        ? value ? '••••••••' : '—'
                        : value || '—'
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'features' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Feature</th>
                {TIERS.map((tier) => (
                  <th key={tier} className="px-4 py-3 text-center text-xs text-muted-foreground uppercase tracking-wider capitalize">
                    {tier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {featureKeys.map((fk) => (
                <tr key={fk} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{fk.replace(/_/g, ' ')}</p>
                    {gateMap[fk]?.free?.description && (
                      <p className="text-xs text-muted-foreground">{gateMap[fk].free.description}</p>
                    )}
                  </td>
                  {TIERS.map((tier) => {
                    const gate = gateMap[fk]?.[tier]
                    if (!gate) return <td key={tier} className="px-4 py-3 text-center text-muted-foreground">—</td>
                    return (
                      <td key={tier} className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleGate(fk, tier, gate.is_enabled)}
                          className={`p-1.5 rounded-full transition-colors ${
                            gate.is_enabled
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-red-100 text-red-400 hover:bg-red-200'
                          }`}
                        >
                          {gate.is_enabled ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'health' && (
        <div className="space-y-4">
          {healthChecks.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t('crmSettings.noHealthChecks')}</p>
          ) : (
            healthChecks.map((hc) => {
              const status = hc.overall_status as string
              return (
                <div key={hc.id as string} className={`p-4 rounded-xl border ${
                  status === 'ok' ? 'border-green-200 bg-green-50' :
                  status === 'warning' ? 'border-amber-200 bg-amber-50' :
                  'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center gap-3">
                    <Shield className={`w-5 h-5 ${
                      status === 'ok' ? 'text-green-600' : status === 'warning' ? 'text-amber-600' : 'text-red-600'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">{status}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(hc.run_at as string).toLocaleString()} • {hc.total_checks as number} checks • {hc.duration_ms as number}ms
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-green-600">{(hc.total_checks as number) - (hc.failures as number) - (hc.warnings as number)} pass</span>
                      {(hc.warnings as number) > 0 && <span className="ml-2 text-amber-600">{hc.warnings as number} warn</span>}
                      {(hc.failures as number) > 0 && <span className="ml-2 text-red-600">{hc.failures as number} fail</span>}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
