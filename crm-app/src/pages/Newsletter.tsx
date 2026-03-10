import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchNewsletterSubscribers,
  toggleSubscriberActive,
  type NewsletterSubscriber,
} from '@/lib/newsletter'
import { Search, Loader2, Mail, CheckCircle2, XCircle } from 'lucide-react'

export default function Newsletter() {
  const { t } = useTranslation()
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    loadSubscribers()
  }, [])

  async function loadSubscribers() {
    setLoading(true)
    try {
      const data = await fetchNewsletterSubscribers()
      setSubscribers(data)
    } catch (err) {
      console.error('Load subscribers error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      await toggleSubscriberActive(id, !currentActive)
      setSubscribers((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, is_active: !currentActive, unsubscribed_at: !currentActive ? null : new Date().toISOString() }
            : s
        )
      )
    } catch (err) {
      console.error('Toggle subscriber error:', err)
    }
  }

  const filtered = subscribers.filter((s) => {
    if (filter === 'active' && !s.is_active) return false
    if (filter === 'inactive' && s.is_active) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        s.email.toLowerCase().includes(q) ||
        s.name?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const activeCount = subscribers.filter((s) => s.is_active).length
  const inactiveCount = subscribers.length - activeCount

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-foreground">{t('newsletter.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeCount} {t('newsletter.activeSubscribers')} · {inactiveCount} {t('newsletter.inactiveSubscribers')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('newsletter.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {t(`newsletter.filter.${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('newsletter.columns.email')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('newsletter.columns.name')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('newsletter.columns.status')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('newsletter.columns.source')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('newsletter.columns.language')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('newsletter.columns.subscribedAt')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('newsletter.columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">{sub.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {sub.name || '—'}
                    </td>
                    <td className="px-5 py-3">
                      {sub.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle2 className="w-3 h-3" />
                          {t('newsletter.statusActive')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <XCircle className="w-3 h-3" />
                          {t('newsletter.statusInactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {sub.source || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {sub.language?.toUpperCase() || '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggle(sub.id, sub.is_active)}
                        className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                          sub.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {sub.is_active ? t('newsletter.deactivate') : t('newsletter.reactivate')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="px-5 py-12 text-center text-muted-foreground">
              {t('newsletter.noSubscribers')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
