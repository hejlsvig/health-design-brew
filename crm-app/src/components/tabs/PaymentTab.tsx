import { useTranslation } from 'react-i18next'
import { type CoachingInfo } from '@/lib/fullPersonView'
import { CreditCard, Package, AlertCircle } from 'lucide-react'

const PAYMENT_COLORS: Record<string, string> = {
  none: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-700',
}

interface Props {
  coaching: CoachingInfo | null
}

export default function PaymentTab({ coaching }: Props) {
  const { t } = useTranslation()

  if (!coaching) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <AlertCircle className="w-8 h-8" />
        <p>{t('payment.noCoaching')}</p>
      </div>
    )
  }

  const paymentStatus = coaching.payment_status || 'none'

  return (
    <div className="space-y-6">
      {/* Payment status card */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
        <div className={`p-3 rounded-xl ${PAYMENT_COLORS[paymentStatus]}`}>
          <CreditCard className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            {t('payment.paymentStatus')}
          </p>
          <p className="text-lg font-serif font-semibold text-foreground capitalize">
            {t(`payment.status.${paymentStatus}`)}
          </p>
        </div>
      </div>

      {/* Coaching details */}
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-3 block">
          <Package className="w-3.5 h-3.5 inline mr-1" />
          {t('payment.coachingDetails')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoField label={t('payment.package')} value={coaching.coaching_package} />
          <InfoField label={t('payment.coachingStatus')} value={coaching.status} />
          <InfoField label="Stripe Customer ID" value={coaching.stripe_customer_id} />
          <InfoField label="Stripe Subscription ID" value={coaching.stripe_subscription_id} />
          <InfoField
            label={t('payment.startDate')}
            value={coaching.start_date ? new Date(coaching.start_date).toLocaleDateString() : null}
          />
          <InfoField
            label={t('payment.endDate')}
            value={coaching.end_date ? new Date(coaching.end_date).toLocaleDateString() : null}
          />
          <InfoField
            label={t('payment.checkinFrequency')}
            value={coaching.check_in_frequency}
          />
          <InfoField
            label={t('payment.remindersEnabled')}
            value={coaching.checkin_reminders_enabled ? t('common.yes') : t('common.no')}
          />
        </div>
      </div>

      {coaching.notes && (
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
            {t('payment.notes')}
          </label>
          <p className="text-sm text-foreground p-3 rounded-lg bg-muted/50 whitespace-pre-wrap">
            {coaching.notes}
          </p>
        </div>
      )}
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground truncate capitalize">{value || '—'}</p>
    </div>
  )
}
