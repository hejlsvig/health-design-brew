import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAllCheckins, type CheckinRow } from '@/lib/checkins'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader2, ClipboardCheck, TrendingDown, TrendingUp, Minus } from 'lucide-react'

export default function Checkins() {
  const { t } = useTranslation()
  const [checkins, setCheckins] = useState<CheckinRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadCheckins()
  }, [])

  async function loadCheckins() {
    setLoading(true)
    try {
      const data = await fetchAllCheckins({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      setCheckins(data)
    } catch (err) {
      console.error('Load checkins error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build chart data from checkins (reverse for chronological order)
  const chartData = [...checkins]
    .reverse()
    .filter((c) => c.weight || c.mood || c.energy)
    .map((c) => ({
      date: new Date(c.created_at).toLocaleDateString(),
      weight: c.weight,
      mood: c.mood,
      energy: c.energy,
      sleep: c.sleep_hours,
    }))

  // Stats
  const weights = checkins.filter((c) => c.weight).map((c) => c.weight!)
  const moods = checkins.filter((c) => c.mood).map((c) => c.mood!)
  const avgMood = moods.length > 0 ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : '—'
  const avgEnergy = checkins.filter((c) => c.energy).length > 0
    ? (checkins.filter((c) => c.energy).map((c) => c.energy!).reduce((a, b) => a + b, 0) / checkins.filter((c) => c.energy).length).toFixed(1)
    : '—'

  return (
    <div>
      <h1 className="font-serif text-2xl text-foreground mb-6">{t('checkins.title')}</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          placeholder={t('checkins.from')}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm"
          placeholder={t('checkins.to')}
        />
        <button
          onClick={loadCheckins}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
        >
          {t('checkins.filter')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label={t('checkins.totalCheckins')} value={checkins.length} />
            <StatCard label={t('checkins.avgMood')} value={avgMood} suffix="/10" />
            <StatCard label={t('checkins.avgEnergy')} value={avgEnergy} suffix="/10" />
            <StatCard
              label={t('checkins.weightTrend')}
              value={
                weights.length >= 2
                  ? `${weights[0] > weights[weights.length - 1] ? '-' : '+'}${Math.abs(weights[0] - weights[weights.length - 1]).toFixed(1)}`
                  : '—'
              }
              suffix="kg"
              icon={
                weights.length >= 2
                  ? weights[0] > weights[weights.length - 1]
                    ? TrendingDown
                    : TrendingUp
                  : Minus
              }
            />
          </div>

          {/* Weight chart */}
          {chartData.length > 1 && (
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                {t('checkins.weightChart')}
              </h2>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--crm-border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="hsl(var(--crm-primary))" strokeWidth={2} dot={{ r: 3 }} name="Weight (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Mood/Energy chart */}
          {chartData.length > 1 && (
            <div className="bg-card rounded-xl border border-border p-6 mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                {t('checkins.wellnessChart')}
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--crm-border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} stroke="hsl(var(--crm-muted-foreground))" />
                  <Tooltip />
                  <Line type="monotone" dataKey="mood" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} name="Mood" />
                  <Line type="monotone" dataKey="energy" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Energy" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Check-in list */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {t('checkins.recentCheckins')} ({checkins.length})
              </h2>
            </div>
            <div className="divide-y divide-border">
              {checkins.map((ci) => {
                const clientName = (ci.coaching_client as Record<string, unknown>)?.profiles
                  ? ((ci.coaching_client as Record<string, unknown>).profiles as Record<string, unknown>)?.name || ((ci.coaching_client as Record<string, unknown>).profiles as Record<string, unknown>)?.email
                  : '—'
                return (
                  <div key={ci.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <ClipboardCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{String(clientName)}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          {ci.weight && <span>⚖️ {ci.weight} kg</span>}
                          {ci.mood != null && <span>😊 Mood: {ci.mood}/10</span>}
                          {ci.energy != null && <span>⚡ Energy: {ci.energy}/10</span>}
                          {ci.sleep_hours != null && <span>😴 Sleep: {ci.sleep_hours}h</span>}
                          {ci.fasting_hours != null && <span>🕐 Fast: {ci.fasting_hours}h</span>}
                        </div>
                        {ci.weekly_win && (
                          <p className="text-xs text-green-600 mt-1">🎉 {ci.weekly_win}</p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ci.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )
              })}
              {checkins.length === 0 && (
                <p className="text-center text-muted-foreground py-12">
                  {t('checkins.noCheckins')}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, suffix, icon: Icon }: { label: string; value: string | number; suffix?: string; icon?: typeof TrendingUp }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <p className="text-2xl font-serif font-bold text-foreground">
          {value}{suffix && <span className="text-sm text-muted-foreground ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  )
}
