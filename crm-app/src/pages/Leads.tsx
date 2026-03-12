import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { fetchLeads, type UnifiedLeadRow, type LeadStatusValue } from '@/lib/leads'
import { fetchCrmUsers, type CrmUserRow } from '@/lib/crmUsers'
import { Search, Loader2, ChevronRight } from 'lucide-react'

// Only show non-coaching statuses in the leads filter
// Coaching statuses are handled in the Coaching page
const STATUS_OPTIONS: LeadStatusValue[] = [
  'new', 'contacted', 'qualified', 'inactive', 'opted_out',
]

export default function Leads() {
  const { t } = useTranslation()
  const [leads, setLeads] = useState<UnifiedLeadRow[]>([])
  const [crmUsers, setCrmUsers] = useState<CrmUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatusValue | ''>('')

  // Build lookup map for assigned_to → CRM user name
  const userMap = new Map(crmUsers.map((u) => [u.id, u.name || u.email]))

  useEffect(() => {
    fetchCrmUsers().then(setCrmUsers).catch(() => {})
  }, [])

  useEffect(() => {
    loadLeads()
  }, [statusFilter])

  async function loadLeads() {
    setLoading(true)
    try {
      const data = await fetchLeads({
        status: statusFilter || undefined,
        search: search || undefined,
      })
      setLeads(data)
    } catch (err) {
      console.error('Load leads error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Client-side search filtering
  const filtered = search
    ? leads.filter((l) => {
        const s = search.toLowerCase()
        return (
          l.profile?.email?.toLowerCase().includes(s) ||
          l.profile?.name?.toLowerCase().includes(s)
        )
      })
    : leads

  const statusColors: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-yellow-100 text-yellow-700',
    qualified: 'bg-green-100 text-green-700',
    coaching_active: 'bg-purple-100 text-purple-700',
    coaching_paused: 'bg-orange-100 text-orange-700',
    coaching_completed: 'bg-gray-100 text-gray-600',
    inactive: 'bg-gray-100 text-gray-500',
    opted_out: 'bg-red-100 text-red-600',
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-foreground mb-6">{t('leads.title')}</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('leads.search')}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatusValue | '')}
          className="px-4 py-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="">{t('leads.allStatuses')}</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`leads.status.${s}`)}
            </option>
          ))}
        </select>
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
                    {t('leads.columns.name')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('leads.columns.email')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('leads.columns.status')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('leads.columns.assignedTo')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('leads.columns.score')}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t('leads.columns.created')}
                  </th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((lead) => (
                  <tr key={lead.user_id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      {lead.origin === 'auth' ? (
                        <Link
                          to={`/leads/${lead.user_id}`}
                          className="text-sm font-medium text-foreground hover:text-primary"
                        >
                          {lead.profile?.name || '—'}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-foreground">
                          {lead.profile?.name || '—'}
                          <span className="ml-1.5 text-[10px] font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            GÆST
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {lead.profile?.email || '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[lead.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {t(`leads.status.${lead.status}`, lead.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {lead.assigned_to ? (
                        <span className="font-medium text-foreground">
                          {userMap.get(lead.assigned_to) || '—'}
                        </span>
                      ) : (
                        <span className="text-yellow-600 italic text-xs">
                          {t('leads.unassigned')}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${lead.lead_score}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {lead.lead_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/leads/${lead.user_id}`}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="px-5 py-12 text-center text-muted-foreground">
              {t('leads.noLeads')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
