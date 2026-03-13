/**
 * Public check-in form — accessible via /checkin?token=xxx
 * No authentication required. Token-validated via RPC functions.
 * Multi-language support (da/en/se).
 * Uses the Shifting Source design system (charcoal, sage, accent amber, DM Serif + Nunito Sans).
 */
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Scale, Battery, Smile, Moon, Utensils, Dumbbell, Timer,
  Brain, Trophy, AlertTriangle, FileText, ChevronDown, ChevronUp,
  Send, CheckCircle2, Loader2, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import {
  fetchCoachingByToken,
  fetchCheckinsByToken,
  submitCheckinByToken,
  EMPTY_FORM,
  type CoachingClientPublic,
  type CheckinEntry,
  type CheckinFormData,
} from '@/lib/checkinPublic'

/* ─── Helpers ─── */

/** Translate a value that may be comma-separated (legacy data) */
function translateOpt(t: (k: string) => string, raw: string): string {
  return raw
    .split(/,\s*/)
    .map(v => { const key = `checkin.opt.${v.trim()}`; const tr = t(key); return tr === key ? v.trim() : tr })
    .join(', ')
}

function weeksSince(startDate: string): number {
  const diff = Date.now() - new Date(startDate).getTime()
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000))
}

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleDateString(lang === 'se' ? 'sv' : lang, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/* ─── Sub-components ─── */

function SliderField({ label, icon: Icon, value, onChange, min = 1, max = 10 }: {
  label: string; icon: React.ElementType; value: number; onChange: (v: number) => void;
  min?: number; max?: number
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-charcoal-foreground/80 mb-2">
        <Icon size={16} className="text-accent" /> {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)}
          className="flex-1 accent-accent h-2 rounded-full"
        />
        <span className="text-lg font-semibold text-charcoal-foreground w-8 text-center">{value}</span>
      </div>
    </div>
  )
}

function RadioGroup({ label, icon: Icon, options, value, onChange }: {
  label: string; icon: React.ElementType;
  options: { value: string; label: string }[];
  value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-charcoal-foreground/80 mb-2">
        <Icon size={16} className="text-accent" /> {label}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button
            key={o.value} type="button" onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              value === o.value
                ? 'bg-accent text-white font-semibold'
                : 'bg-charcoal/80 text-charcoal-foreground/70 border border-sage/20 hover:border-sage/40'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="bg-charcoal/40 border border-sage/15 rounded-xl p-5 space-y-4">
      <h3 className="flex items-center gap-2 text-charcoal-foreground font-semibold">
        <Icon size={18} className="text-accent" /> {title}
      </h3>
      {children}
    </div>
  )
}

function WeightTrend({ current, previous }: { current: number | null; previous: number | null }) {
  if (current == null || previous == null) return null
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return <Minus size={14} className="text-sage" />
  return diff < 0
    ? <TrendingDown size={14} className="text-green-400" />
    : <TrendingUp size={14} className="text-red-400" />
}

/* ─── History card ─── */

function HistoryCard({ entry, lang, t, prevWeight }: {
  entry: CheckinEntry; lang: string; t: (k: string) => string; prevWeight: number | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-charcoal/30 border border-sage/15 rounded-lg overflow-hidden">
      <button
        type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-charcoal/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="bg-accent/20 text-accent text-xs font-bold px-2 py-1 rounded">
            {t('checkin.week')} {entry.week_number ?? '—'}
          </span>
          <span className="text-charcoal-foreground/50 text-sm">{formatDate(entry.created_at, lang)}</span>
        </div>
        <div className="flex items-center gap-4">
          {entry.weight != null && (
            <span className="flex items-center gap-1 text-sm text-charcoal-foreground/70">
              <Scale size={14} /> {entry.weight} kg
              <WeightTrend current={entry.weight} previous={prevWeight} />
            </span>
          )}
          {entry.mood != null && (
            <span className="text-sm text-charcoal-foreground/50">😊 {entry.mood}/10</span>
          )}
          {open ? <ChevronUp size={16} className="text-sage" /> : <ChevronDown size={16} className="text-sage" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm border-t border-sage/15">
          {entry.energy != null && <Stat label={t('checkin.energy')} value={`${entry.energy}/10`} />}
          {entry.hunger && <Stat label={t('checkin.hunger')} value={translateOpt(t, entry.hunger)} />}
          {entry.cravings && <Stat label={t('checkin.cravings')} value={translateOpt(t, entry.cravings)} />}
          {entry.sleep_hours != null && <Stat label={t('checkin.sleepHours')} value={`${entry.sleep_hours}h`} />}
          {entry.sleep_quality != null && <Stat label={t('checkin.sleepQuality')} value={`${entry.sleep_quality}/10`} />}
          {entry.digestion && <Stat label={t('checkin.digestion')} value={translateOpt(t, entry.digestion)} />}
          {entry.activity && <Stat label={t('checkin.activity')} value={translateOpt(t, entry.activity)} />}
          {entry.fasting_hours != null && <Stat label={t('checkin.fastingHours')} value={`${entry.fasting_hours}h`} />}
          {entry.fasting_feeling && <Stat label={t('checkin.fastingFeeling')} value={translateOpt(t, entry.fasting_feeling)} />}
          {entry.stress_factors && <Stat label={t('checkin.stress')} value={translateOpt(t, entry.stress_factors)} />}
          {entry.weekly_win && (
            <div className="col-span-full">
              <span className="text-charcoal-foreground/50">{t('checkin.weeklyWin')}:</span>{' '}
              <span className="text-charcoal-foreground/80">{entry.weekly_win}</span>
            </div>
          )}
          {entry.deviations && (
            <div className="col-span-full">
              <span className="text-charcoal-foreground/50">{t('checkin.deviations')}:</span>{' '}
              <span className="text-charcoal-foreground/80">{entry.deviations}</span>
            </div>
          )}
          {entry.notes && (
            <div className="col-span-full">
              <span className="text-charcoal-foreground/50">{t('checkin.notes')}:</span>{' '}
              <span className="text-charcoal-foreground/80">{entry.notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-charcoal-foreground/40 text-xs">{label}</span>
      <p className="text-charcoal-foreground/80">{value}</p>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/* ─── Main Component ─── */
/* ═══════════════════════════════════════════ */

export default function CheckIn() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language || 'da'
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [client, setClient] = useState<CoachingClientPublic | null>(null)
  const [history, setHistory] = useState<CheckinEntry[]>([])
  const [form, setForm] = useState<CheckinFormData>({ ...EMPTY_FORM })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  /* ─── Load data ─── */
  const loadData = useCallback(async () => {
    if (!token) { setError('missing_token'); setLoading(false); return }
    try {
      const [c, h] = await Promise.all([
        fetchCoachingByToken(token),
        fetchCheckinsByToken(token),
      ])
      setClient(c)
      setHistory(h)
      // Set language from client profile
      if (c.profile.language && ['da', 'en', 'se'].includes(c.profile.language)) {
        i18n.changeLanguage(c.profile.language)
      }
    } catch {
      setError('invalid_token')
    } finally {
      setLoading(false)
    }
  }, [token, i18n])

  useEffect(() => { loadData() }, [loadData])

  /* ─── Submit ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await submitCheckinByToken(token, form)
      setSubmitted(true)
      // Refresh history
      const h = await fetchCheckinsByToken(token)
      setHistory(h)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'submit_error')
    } finally {
      setSubmitting(false)
    }
  }

  /* ─── Field updater ─── */
  const set = <K extends keyof CheckinFormData>(key: K) => (val: CheckinFormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  /* ─── Radio option builders ─── */
  const hungerOpts = [
    { value: 'none', label: t('checkin.opt.none') },
    { value: 'light', label: t('checkin.opt.light') },
    { value: 'moderate', label: t('checkin.opt.moderate') },
    { value: 'strong', label: t('checkin.opt.strong') },
  ]
  const digestionOpts = [
    { value: 'normal', label: t('checkin.opt.normal') },
    { value: 'bloated', label: t('checkin.opt.bloated') },
    { value: 'constipation', label: t('checkin.opt.constipation') },
  ]
  const activityOpts = [
    { value: 'none', label: t('checkin.opt.none') },
    { value: 'light', label: t('checkin.opt.light') },
    { value: 'moderate', label: t('checkin.opt.moderate') },
    { value: 'hard', label: t('checkin.opt.hard') },
  ]
  const fastingOpts = [
    { value: 'easy', label: t('checkin.opt.easy') },
    { value: 'ok', label: t('checkin.opt.ok') },
    { value: 'hard', label: t('checkin.opt.hard') },
  ]
  const stressOpts = [
    { value: 'none', label: t('checkin.opt.none') },
    { value: 'work', label: t('checkin.opt.work') },
    { value: 'family', label: t('checkin.opt.family') },
    { value: 'travel', label: t('checkin.opt.travel') },
    { value: 'illness', label: t('checkin.opt.illness') },
  ]

  /* ─── Error / Loading states ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    )
  }

  if (error === 'missing_token' || error === 'invalid_token') {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="bg-charcoal/60 border border-sage/20 rounded-xl p-8 text-center max-w-md">
          <AlertTriangle size={48} className="text-accent mx-auto mb-4" />
          <h1 className="text-xl font-serif font-bold text-charcoal-foreground mb-2">{t('checkin.errorTitle')}</h1>
          <p className="text-charcoal-foreground/60">{t(`checkin.error.${error}`)}</p>
        </div>
      </div>
    )
  }

  if (!client) return null

  const weeksOnProgram = weeksSince(client.start_date)

  /* ─── Success state ─── */
  if (submitted) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
        <div className="bg-charcoal/60 border border-sage/20 rounded-xl p-8 text-center max-w-md">
          <CheckCircle2 size={56} className="text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-serif font-bold text-charcoal-foreground mb-2">{t('checkin.successTitle')}</h1>
          <p className="text-charcoal-foreground/60 mb-6">{t('checkin.successMsg')}</p>
          <button
            onClick={() => { setSubmitted(false); setForm({ ...EMPTY_FORM }) }}
            className="text-accent hover:text-accent/80 underline text-sm"
          >
            {t('checkin.submitAnother')}
          </button>
        </div>
      </div>
    )
  }

  /* ─── Main form ─── */
  return (
    <div className="min-h-screen bg-charcoal py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal-foreground">{t('checkin.title')}</h1>
          <p className="text-charcoal-foreground/60 font-sans">{t('checkin.subtitle')}</p>
        </div>

        {/* Client info bar */}
        <div className="bg-charcoal/40 border border-sage/15 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-charcoal-foreground font-semibold">{client.profile.full_name}</p>
            <p className="text-charcoal-foreground/50 text-sm">
              {t('checkin.week')} {weeksOnProgram} · {client.coaching_package ?? t('checkin.standard')}
            </p>
          </div>
          <div className="flex gap-4 text-sm text-charcoal-foreground/50">
            {client.profile.start_weight != null && (
              <span>{t('checkin.startWeight')}: {client.profile.start_weight} kg</span>
            )}
            {client.profile.goal_weight != null && (
              <span>{t('checkin.goalWeight')}: {client.profile.goal_weight} kg</span>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* 1. Weight & Wellness */}
          <SectionCard title={t('checkin.section.weightWellness')} icon={Scale}>
            <div>
              <label className="text-sm text-charcoal-foreground/70 mb-1 block">{t('checkin.currentWeight')} (kg)</label>
              <input
                type="number" step="0.1" min="30" max="300"
                value={form.weight ?? ''}
                onChange={e => set('weight')(e.target.value ? +e.target.value : null)}
                className="w-full bg-charcoal/80 border border-sage/20 rounded-lg px-3 py-2 text-charcoal-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                placeholder="0.0"
              />
            </div>
            <SliderField label={t('checkin.energy')} icon={Battery} value={form.energy ?? 5} onChange={set('energy')} />
            <SliderField label={t('checkin.mood')} icon={Smile} value={form.mood ?? 5} onChange={set('mood')} />
          </SectionCard>

          {/* 2. Hunger & Cravings */}
          <SectionCard title={t('checkin.section.hungerCravings')} icon={Utensils}>
            <RadioGroup label={t('checkin.hunger')} icon={Utensils} options={hungerOpts} value={form.hunger} onChange={set('hunger')} />
            <RadioGroup label={t('checkin.cravings')} icon={Utensils} options={hungerOpts} value={form.cravings} onChange={set('cravings')} />
          </SectionCard>

          {/* 3. Sleep */}
          <SectionCard title={t('checkin.section.sleep')} icon={Moon}>
            <div>
              <label className="text-sm text-charcoal-foreground/70 mb-1 block">{t('checkin.sleepHours')}</label>
              <input
                type="number" step="0.5" min="0" max="16"
                value={form.sleep_hours ?? ''}
                onChange={e => set('sleep_hours')(e.target.value ? +e.target.value : null)}
                className="w-full bg-charcoal/80 border border-sage/20 rounded-lg px-3 py-2 text-charcoal-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                placeholder="7.5"
              />
            </div>
            <SliderField label={t('checkin.sleepQuality')} icon={Moon} value={form.sleep_quality ?? 5} onChange={set('sleep_quality')} />
          </SectionCard>

          {/* 4. Digestion */}
          <SectionCard title={t('checkin.section.digestion')} icon={Utensils}>
            <RadioGroup label={t('checkin.digestion')} icon={Utensils} options={digestionOpts} value={form.digestion} onChange={set('digestion')} />
          </SectionCard>

          {/* 5. Activity */}
          <SectionCard title={t('checkin.section.activity')} icon={Dumbbell}>
            <RadioGroup label={t('checkin.activity')} icon={Dumbbell} options={activityOpts} value={form.activity} onChange={set('activity')} />
          </SectionCard>

          {/* 6. Fasting */}
          <SectionCard title={t('checkin.section.fasting')} icon={Timer}>
            <div>
              <label className="text-sm text-charcoal-foreground/70 mb-1 block">{t('checkin.fastingHours')}</label>
              <input
                type="number" step="1" min="0" max="48"
                value={form.fasting_hours ?? ''}
                onChange={e => set('fasting_hours')(e.target.value ? +e.target.value : null)}
                className="w-full bg-charcoal/80 border border-sage/20 rounded-lg px-3 py-2 text-charcoal-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                placeholder="16"
              />
            </div>
            <RadioGroup label={t('checkin.fastingFeeling')} icon={Timer} options={fastingOpts} value={form.fasting_feeling} onChange={set('fasting_feeling')} />
          </SectionCard>

          {/* 7. Stress */}
          <SectionCard title={t('checkin.section.stress')} icon={Brain}>
            <RadioGroup label={t('checkin.stress')} icon={Brain} options={stressOpts} value={form.stress_factors} onChange={set('stress_factors')} />
          </SectionCard>

          {/* 8. Weekly Win */}
          <SectionCard title={t('checkin.section.weeklyWin')} icon={Trophy}>
            <textarea
              value={form.weekly_win} onChange={e => set('weekly_win')(e.target.value)}
              rows={3} placeholder={t('checkin.weeklyWinPlaceholder')}
              className="w-full bg-charcoal/80 border border-sage/20 rounded-lg px-3 py-2 text-charcoal-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
            />
          </SectionCard>

          {/* 9. Deviations */}
          <SectionCard title={t('checkin.section.deviations')} icon={AlertTriangle}>
            <textarea
              value={form.deviations} onChange={e => set('deviations')(e.target.value)}
              rows={3} placeholder={t('checkin.deviationsPlaceholder')}
              className="w-full bg-charcoal/80 border border-sage/20 rounded-lg px-3 py-2 text-charcoal-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
            />
          </SectionCard>

          {/* 10. Notes */}
          <SectionCard title={t('checkin.section.notes')} icon={FileText}>
            <textarea
              value={form.notes} onChange={e => set('notes')(e.target.value)}
              rows={3} placeholder={t('checkin.notesPlaceholder')}
              className="w-full bg-charcoal/80 border border-sage/20 rounded-lg px-3 py-2 text-charcoal-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none resize-none"
            />
          </SectionCard>

          {/* Error */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors text-lg"
          >
            {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            {t('checkin.submit')}
          </button>
        </form>

        {/* History */}
        {history.length > 0 && (
          <div className="space-y-3">
            <button
              type="button" onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-accent hover:text-accent/80 font-semibold"
            >
              {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              {t('checkin.history')} ({history.length})
            </button>
            {showHistory && (
              <div className="space-y-2">
                {history.map((entry, i) => (
                  <HistoryCard
                    key={entry.id} entry={entry} lang={lang} t={t}
                    prevWeight={i < history.length - 1 ? history[i + 1]?.weight ?? null : null}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-charcoal-foreground/30 text-xs pb-4 font-sans">
          Powered by Shifting Source
        </p>
      </div>
    </div>
  )
}
