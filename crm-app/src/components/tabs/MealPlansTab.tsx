import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type MealPlan, sendMealPlan, type SendMealPlanResult } from '@/lib/mealplans'
import { type FullProfile } from '@/lib/fullPersonView'
import {
  FileText, Cpu, DollarSign, CalendarDays, Send, Loader2,
  Check, X, Download, UtensilsCrossed,
} from 'lucide-react'

interface Props {
  mealPlans: MealPlan[]
  /** Client profile — needed for "Send kostplan" modal pre-fill */
  profile?: FullProfile | null
  /** Authenticated coach user ID — required to send kostplan */
  coachId?: string | null
  /** Callback after a new meal plan is sent successfully */
  onPlanSent?: () => void
}

export default function MealPlansTab({ mealPlans, profile, coachId, onPlanSent }: Props) {
  const { t } = useTranslation()
  const [showModal, setShowModal] = useState(false)

  return (
    <div className="space-y-4">
      {/* Send button — only visible for coaches when profile is available */}
      {profile && coachId && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            Send kostplan
          </button>
        </div>
      )}

      {/* Existing meal plan history */}
      {mealPlans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <FileText className="w-8 h-8" />
          <p>{t('mealPlans.noPlans')}</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t('mealPlans.total', { count: mealPlans.length })}
          </p>

          {mealPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
            >
              <div className="p-2.5 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {plan.pdf_filename}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  {plan.num_days && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {plan.num_days} {t('mealPlans.days')}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    {plan.model}
                  </span>
                  {plan.tokens_used && (
                    <span>{plan.tokens_used.toLocaleString()} tokens</span>
                  )}
                  {plan.cost_usd != null && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${plan.cost_usd.toFixed(3)}
                    </span>
                  )}
                </div>
              </div>
              {plan.pdf_storage_path && (
                <a
                  href={plan.pdf_storage_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              )}
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {new Date(plan.created_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </>
      )}

      {/* Send kostplan modal */}
      {showModal && profile && coachId && (
        <SendMealPlanModal
          profile={profile}
          coachId={coachId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            onPlanSent?.()
          }}
        />
      )}
    </div>
  )
}

/* ─── Send Meal Plan Modal ─── */

function SendMealPlanModal({
  profile,
  coachId,
  onClose,
  onSuccess,
}: {
  profile: FullProfile
  coachId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<SendMealPlanResult | null>(null)

  // Pre-fill from client profile
  const [params, setParams] = useState({
    mealsPerDay: profile.meals_per_day || 3,
    numDays: 7,
    prepTime: profile.prep_time || 'medium',
    budget: 'medium',
    dailyCalories: profile.daily_calories || profile.tdee || 2000,
    leftoverStrategy: 'next_day',
    antiInflammatory: false,
    avoidProcessed: false,
    dietType: profile.diet_type || 'Custom Keto',
  })

  function update<K extends keyof typeof params>(key: K, val: (typeof params)[K]) {
    setParams(p => ({ ...p, [key]: val }))
  }

  async function handleSend() {
    setGenerating(true)
    setResult(null)
    try {
      const res = await sendMealPlan({
        name: profile.name || 'Klient',
        email: profile.email,
        language: profile.language || 'da',
        gender: profile.gender,
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        activity: profile.activity_level,
        daily_calories: params.dailyCalories,
        meals_per_day: params.mealsPerDay,
        num_days: params.numDays,
        prep_time: params.prepTime,
        leftovers: params.leftoverStrategy !== 'none',
        leftovers_strategy: params.leftoverStrategy,
        excluded_ingredients: profile.excluded_ingredients?.join(', ') || '',
        diet_type: params.dietType,
        budget: params.budget,
        health_anti_inflammatory: params.antiInflammatory,
        health_avoid_processed: params.avoidProcessed,
        weight_goal: profile.weight_goal,
        units: profile.units || 'metric',
        coach_id: coachId,
      })
      setResult(res)
      if (res.success) {
        // Auto-close after 3 seconds on success
        setTimeout(() => onSuccess(), 3000)
      }
    } catch (err) {
      setResult({ success: false, error: String(err) })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="p-2 rounded-lg bg-primary/10">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-serif font-semibold text-foreground">Send kostplan</h2>
            <p className="text-sm text-muted-foreground">{profile.name || profile.email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Client summary */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50">
            <InfoPair label="Email" value={profile.email} />
            <InfoPair label="Sprog" value={({ da: 'Dansk', en: 'English', se: 'Svenska' } as Record<string, string>)[profile.language] || profile.language} />
            <InfoPair label="Vægt" value={profile.weight ? `${profile.weight} kg` : '—'} />
            <InfoPair label="Højde" value={profile.height ? `${profile.height} cm` : '—'} />
            <InfoPair label="TDEE" value={profile.tdee ? `${Math.round(profile.tdee)} kcal` : '—'} />
            <InfoPair label="Kalorier/dag" value={`${params.dailyCalories} kcal`} />
          </div>

          {/* Editable parameters */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Tilpas kostplan</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Kalorier/dag</label>
                <input
                  type="number"
                  value={params.dailyCalories}
                  onChange={e => update('dailyCalories', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Antal dage</label>
                <select
                  value={params.numDays}
                  onChange={e => update('numDays', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  {[3, 5, 7, 14].map(n => (
                    <option key={n} value={n}>{n} dage</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Måltider/dag</label>
                <select
                  value={params.mealsPerDay}
                  onChange={e => update('mealsPerDay', Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  {[2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} måltider</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tilberedningstid</label>
                <select
                  value={params.prepTime}
                  onChange={e => update('prepTime', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="quick">Hurtig (15-20 min)</option>
                  <option value="medium">Medium (30-45 min)</option>
                  <option value="elaborate">Avanceret (60+ min)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Budget</label>
                <select
                  value={params.budget}
                  onChange={e => update('budget', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="budget">Budget</option>
                  <option value="medium">Medium</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Rester-strategi</label>
                <select
                  value={params.leftoverStrategy}
                  onChange={e => update('leftoverStrategy', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="none">Ingen rester</option>
                  <option value="next_day">Genbrug næste dag</option>
                  <option value="batch_cook">Batch cooking</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.antiInflammatory}
                  onChange={e => update('antiInflammatory', e.target.checked)}
                  className="rounded border-border"
                />
                Anti-inflammatorisk
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.avoidProcessed}
                  onChange={e => update('avoidProcessed', e.target.checked)}
                  className="rounded border-border"
                />
                Undgå forarbejdet mad
              </label>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {result.success ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Kostplan sendt!</span>
                  </div>
                  <p className="text-sm text-green-600">
                    Emailen er sendt til {profile.email} med en PDF-kostplan.
                  </p>
                  {result.pdfUrl && (
                    <a
                      href={result.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-green-700 hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </a>
                  )}
                  {result.tokens_used && (
                    <p className="text-xs text-green-600">
                      {result.tokens_used.toLocaleString()} tokens · ${result.cost_usd?.toFixed(3)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <X className="w-5 h-5" />
                  <span className="text-sm">{result.error}</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {!result?.success && (
            <div className="flex gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={handleSend}
                disabled={generating || !params.dailyCalories}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Genererer...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Generer og send
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  )
}
