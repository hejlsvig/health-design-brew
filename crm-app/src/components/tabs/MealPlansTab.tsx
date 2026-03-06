import { useTranslation } from 'react-i18next'
import { type MealPlan } from '@/lib/mealplans'
import { FileText, Cpu, DollarSign, CalendarDays } from 'lucide-react'

interface Props {
  mealPlans: MealPlan[]
}

export default function MealPlansTab({ mealPlans }: Props) {
  const { t } = useTranslation()

  if (mealPlans.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <FileText className="w-8 h-8" />
        <p>{t('mealPlans.noPlans')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground mb-3">
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
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(plan.created_at).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}
