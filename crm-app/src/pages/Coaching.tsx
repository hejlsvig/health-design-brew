import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { fetchCoachingClients, type CoachingClient } from '@/lib/coaching'
import { Loader2, HeartPulse } from 'lucide-react'

export default function Coaching() {
  const { t } = useTranslation()
  const [clients, setClients] = useState<CoachingClient[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'active' | 'inactive' | 'completed' | ''>('')

  useEffect(() => {
    fetchCoachingClients()
      .then(setClients)
      .catch((err) => console.error('Load coaching error:', err))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter
    ? clients.filter((c) => c.status === filter)
    : clients

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-foreground mb-6">{t('coaching.title')}</h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['', 'active', 'inactive', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === '' ? t('leads.allStatuses') : t(`coaching.${f}`)}
          </button>
        ))}
      </div>

      {/* Client list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((client) => (
          <Link
            key={client.id}
            to={`/coaching/${client.id}`}
            className="bg-card rounded-xl border border-border p-5 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-muted">
                <HeartPulse className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {client.profile?.name || client.profile?.email || 'Client'}
                </p>
                <p className="text-xs text-muted-foreground">{client.profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  client.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : client.status === 'completed'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {t(`coaching.${client.status}`)}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(client.start_date).toLocaleDateString()}
              </span>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{t('coaching.noClients')}</p>
      )}
    </div>
  )
}
