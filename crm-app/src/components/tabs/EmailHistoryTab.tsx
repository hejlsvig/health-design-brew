import { useTranslation } from 'react-i18next'
import { type EmailSend } from '@/lib/emails'
import { Mail, CheckCircle, Eye, MousePointerClick, AlertTriangle, XCircle, Clock } from 'lucide-react'

const STATUS_CONFIG: Record<string, { icon: typeof Mail; color: string }> = {
  queued: { icon: Clock, color: 'text-gray-500' },
  sent: { icon: CheckCircle, color: 'text-blue-500' },
  delivered: { icon: CheckCircle, color: 'text-green-500' },
  opened: { icon: Eye, color: 'text-emerald-600' },
  clicked: { icon: MousePointerClick, color: 'text-purple-500' },
  bounced: { icon: AlertTriangle, color: 'text-orange-500' },
  failed: { icon: XCircle, color: 'text-red-500' },
}

interface Props {
  emails: EmailSend[]
}

export default function EmailHistoryTab({ emails }: Props) {
  const { t } = useTranslation()

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <Mail className="w-8 h-8" />
        <p>{t('emailHistory.noEmails')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">
        {t('emailHistory.total', { count: emails.length })}
      </p>

      {emails.map((email) => {
        const cfg = STATUS_CONFIG[email.status] || STATUS_CONFIG.sent
        const Icon = cfg.icon
        return (
          <div
            key={email.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
          >
            <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {email.subject || email.email_type}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">{email.email_type}</span>
                <span className={`text-xs font-medium ${cfg.color}`}>
                  {t(`emailHistory.status.${email.status}`)}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {email.sent_at && (
                  <span>{t('emailHistory.sentAt')}: {new Date(email.sent_at).toLocaleString()}</span>
                )}
                {email.opened_at && (
                  <span>{t('emailHistory.openedAt')}: {new Date(email.opened_at).toLocaleString()}</span>
                )}
                {email.clicked_at && (
                  <span>{t('emailHistory.clickedAt')}: {new Date(email.clicked_at).toLocaleString()}</span>
                )}
              </div>
              {email.bounce_reason && (
                <p className="text-xs text-red-500 mt-1">{email.bounce_reason}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {new Date(email.created_at).toLocaleDateString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
