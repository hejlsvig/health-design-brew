import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAllCheckins, type CheckinRow } from '@/lib/checkins'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts'
import {
  Loader2, TrendingDown, TrendingUp, Minus, Users, HeartPulse,
  Activity, Moon, Scale, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CoachingClient {
  id: string
  profile_id: string
  status: string
  profiles?: { name: string | null; email: string }
}

type TimeRange = '7d' | '30d' | '90d' | 'all'

export default function Analytics() {
  const { t } = useTranslation()
  const [checkins, setCheckins] = useState<CheckinRow[]>([])
  const [clients, setClients] = useState<CoachingClient[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')

  useEffect(() => {
    loadData()
  }, [timeRange])

  async function loadData() {
    setLoading(true)
    try {
      const dateFrom = timeRange !== 'all'
        ? new Date(Date.now() - ({
            '7d': 7,
            '30d': 30,
            '90d': 90,
          }[timeRange]!) * 86400000).toISOString()
        : undefined

      const [checkinsData, clientsData] = await Promise.all([
        fetchAllCheckins({ dateFrom }, 500),
        supabase
          .from('coaching_clients')
          .select('id, profile_id, status, profiles (name, email)')
          .then(({ data }) => (data || []) as unknown as CoachingClient[]),
      ])
      setCheckins(checkinsData)
      setClients(clientsData)
    } catch (err) {
      console.error('Analytics load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Computed metrics ──

  const activeClients = clients.filter((c) => c.status === 'active').length
  const totalClients = clients.length

  const weights = checkins.filter((c) => c.weight != null).map((c) => c.weight!)
  const moods = checkins.filter((c) => c.mood != null).map((c) => c.mood!)
  const energies = checkins.filter((c) => c.energy != null).map((c) => c.energy!)
  const sleeps = checkins.filter((c) => c.sleep_hours != null).map((c) => c.sleep_hours!)

  const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0

  const avgMood = avg(moods).toFixed(1)
  const avgEnergy = avg(energies).toFixed(1)
  const avgSleep = avg(sleeps).toFixed(1)

  const weightTrendValue = weights.length >= 2
    ? (weights[0] - weights[weights.length - 1]).toFixed(1)
    : null

  // ── Chart: Weekly aggregated trends ──

  const weeklyTrends = useMemo(() => {
    const sorted = [...checkins].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const weekMap = new Map<string, CheckinRow[]>()
    for (const ci of sorted) {
      const d = new Date(ci.created_at)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay() + 1) // Monday
      const key = weekStart.toISOString().split('T')[0]
      if (!weekMap.has(key)) weekMap.set(key, [])
      weekMap.get(key)!.push(ci)
    }
    return Array.from(weekMap.entries()).map(([week, cis]) => {
      const w = cis.filter((c) => c.weight != null).map((c) => c.weight!)
      const m = cis.filter((c) => c.mood != null).map((c) => c.mood!)
      const e = cis.filter((c) => c.energy != null).map((c) => c.energy!)
      const s = cis.filter((c) => c.sleep_hours != null).map((c) => c.sleep_hours!)
      return {
        week: new Date(week).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }),
        avgWeight: w.length > 0 ? Math.round(avg(w) * 10) / 10 : null,
        avgMood: m.length > 0 ? Math.round(avg(m) * 10) / 10 : null,
        avgEnergy: e.length > 0 ? Math.round(avg(e) * 10) / 10 : null,
        avgSleep: s.length > 0 ? Math.round(avg(s) * 10) / 10 : null,
        checkinCount: cis.length,
      }
    })
  }, [checkins])

  // ── Chart: Per-client progress ──

  const clientProgress = useMemo(() => {
    const clientMap = new Map<string, { name: string; checkins: CheckinRow[] }>()
    for (const ci of checkins) {
      const client = ci.coaching_client as Record<string, unknown> | undefined
      const profile = client?.profiles as Record<string, unknown> | undefined
      const name = (profile?.name as string) || (profile?.email as string) || 'Ukendt'
      const clientId = ci.coaching_client_id
      if (!clientMap.has(clientId)) clientMap.set(clientId, { name, checkins: [] })
      clientMap.get(clientId)!.checkins.push(ci)
    }
    return Array.from(clientMap.values())
      .map(({ name, checkins: cis }) => {
        const w = cis.filter((c) => c.weight != null).map((c) => c.weight!)
        const m = cis.filter((c) => c.mood != null).map((c) => c.mood!)
        const e = cis.filter((c) => c.energy != null).map((c) => c.energy!)
        return {
          name: name.split(' ')[0], // First name only for chart
          checkinCount: cis.length,
          avgMood: m.length > 0 ? Math.round(avg(m) * 10) / 10 : 0,
          avgEnergy: e.length > 0 ? Math.round(avg(e) * 10) / 10 : 0,
          weightChange: w.length >= 2
            ? Math.round((w[w.length - 1] - w[0]) * 10) / 10
            : 0,
        }
      })
      .sort((a, b) => b.checkinCount - a.checkinCount)
  }, [checkins])

  // ── Chart: Check-in frequency ──

  const checkinFrequency = useMemo(() => {
    const dayMap = new Map<string, number>()
    for (const ci of checkins) {
      const day = new Date(ci.created_at).toLocaleDateString('da-DK', { weekday: 'short' })
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
    }
    const days = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn']
    return days.map((d) => ({ day: d, count: dayMap.get(d) || 0 }))
  }, [checkins])

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '7d', label: t('analytics.range7d') },
    { value: '30d', label: t('analytics.range30d') },
    { value: '90d', label: t('analytics.range90d') },
    { value: 'all', label: t('analytics.rangeAll') },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-foreground">{t('analytics.title')}</h1>
        <div className="flex gap-1 bg-card rounded-lg border border-border p-1">
          {timeRanges.map((r) => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                timeRange === r.value
                  ? 'bg-primary text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <KpiCard
              icon={Users}
              label={t('analytics.activeClients')}
              value={`${activeClients}/${totalClients}`}
              color="text-blue-500"
            />
            <KpiCard
              icon={Calendar}
              label={t('analytics.totalCheckins')}
              value={checkins.length}
              color="text-indigo-500"
            />
            <KpiCard
              icon={HeartPulse}
              label={t('analytics.avgMood')}
              value={avgMood}
              suffix="/10"
              color="text-purple-500"
            />
            <KpiCard
              icon={Activity}
              label={t('analytics.avgEnergy')}
              value={avgEnergy}
              suffix="/10"
              color="text-emerald-500"
            />
            <KpiCard
              icon={Moon}
              label={t('analytics.avgSleep')}
              value={avgSleep}
              suffix="h"
              color="text-sky-500"
            />
            <KpiCard
              icon={Scale}
              label={t('analytics.weightTrend')}
              value={weightTrendValue ? `${parseFloat(weightTrendValue) > 0 ? '-' : '+'}${Math.abs(parseFloat(weightTrendValue))}` : '—'}
              suffix={weightTrendValue ? 'kg' : ''}
              color="text-amber-500"
              trendIcon={
                weightTrendValue
                  ? parseFloat(weightTrendValue) > 0 ? TrendingDown : TrendingUp
                  : Minus
              }
            />
          </div>

          {/* ── Charts Row 1: Trends ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Weight Trend */}
            {weeklyTrends.length > 1 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {t('analytics.weightOverTime')}
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={weeklyTrends}>
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--crm-primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--crm-primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--crm-border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip />
                    <Area type="monotone" dataKey="avgWeight" stroke="hsl(var(--crm-primary))" fill="url(#weightGradient)" strokeWidth={2} name={t('analytics.avgWeight')} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Mood & Energy */}
            {weeklyTrends.length > 1 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {t('analytics.wellnessTrends')}
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--crm-border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgMood" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name={t('analytics.mood')} />
                    <Line type="monotone" dataKey="avgEnergy" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name={t('analytics.energy')} />
                    <Line type="monotone" dataKey="avgSleep" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} name={t('analytics.sleep')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Charts Row 2: Client Progress + Frequency ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Per-client comparison */}
            {clientProgress.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {t('analytics.clientComparison')}
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={clientProgress.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--crm-border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgMood" fill="#8b5cf6" name={t('analytics.mood')} radius={[0, 4, 4, 0]} />
                    <Bar dataKey="avgEnergy" fill="#10b981" name={t('analytics.energy')} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Check-in frequency by day of week */}
            {checkins.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {t('analytics.checkinFrequency')}
                </h2>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={checkinFrequency}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--crm-border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--crm-primary))" name={t('analytics.checkins')} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Check-in Activity + Weekly volume ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Check-in volume over time */}
            {weeklyTrends.length > 1 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {t('analytics.weeklyVolume')}
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={weeklyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--crm-border))" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                    <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="checkinCount" fill="hsl(var(--crm-primary))" name={t('analytics.checkins')} radius={[4, 4, 0, 0]} opacity={0.8} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Client weight progress leaderboard */}
            {clientProgress.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  {t('analytics.clientProgress')}
                </h2>
                <div className="space-y-3">
                  {clientProgress.slice(0, 8).map((cp, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {cp.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{cp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {cp.checkinCount} check-ins
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {cp.weightChange !== 0 && (
                          <span className={cn(
                            'flex items-center gap-1',
                            cp.weightChange < 0 ? 'text-green-600' : 'text-red-500'
                          )}>
                            {cp.weightChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                            {Math.abs(cp.weightChange)} kg
                          </span>
                        )}
                        <span className="text-purple-500">😊 {cp.avgMood}</span>
                        <span className="text-emerald-500">⚡ {cp.avgEnergy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {checkins.length === 0 && (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('analytics.noData')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
  trendIcon: TrendIcon,
}: {
  icon: typeof Users
  label: string
  value: string | number
  suffix?: string
  color: string
  trendIcon?: typeof TrendingUp
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-4 h-4', color)} />
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <div className="flex items-center gap-1.5">
        {TrendIcon && <TrendIcon className="w-4 h-4 text-muted-foreground" />}
        <p className="text-xl font-serif font-bold text-foreground">
          {value}
          {suffix && <span className="text-sm text-muted-foreground ml-0.5">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}
