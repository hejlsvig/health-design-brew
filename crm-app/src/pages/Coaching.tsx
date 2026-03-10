import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { fetchCoachingClients, assignCoach, type CoachingClient } from '@/lib/coaching'
import { fetchCrmUsers, type CrmUserRow } from '@/lib/crmUsers'
import {
  Loader2, HeartPulse, LayoutGrid, Table2, Columns3,
  ChevronRight, Search,
} from 'lucide-react'

type ViewMode = 'cards' | 'table' | 'kanban'
type StatusFilter = 'active' | 'inactive' | 'completed' | ''

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
}

const KANBAN_COLUMNS: { status: CoachingClient['status']; color: string }[] = [
  { status: 'active', color: 'border-green-500' },
  { status: 'inactive', color: 'border-yellow-500' },
  { status: 'completed', color: 'border-gray-400' },
]

export default function Coaching() {
  const { t } = useTranslation()
  const [clients, setClients] = useState<CoachingClient[]>([])
  const [crmUsers, setCrmUsers] = useState<CrmUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>(() => {
    try { return (localStorage.getItem('crm_coaching_view') as ViewMode) || 'cards' }
    catch { return 'cards' }
  })

  useEffect(() => {
    fetchCoachingClients()
      .then(setClients)
      .catch((err) => console.error('Load coaching error:', err))
      .finally(() => setLoading(false))
    fetchCrmUsers().then(setCrmUsers).catch(() => {})
  }, [])

  async function handleReassignCoach(profileId: string, newCoachId: string | null) {
    try {
      await assignCoach(profileId, newCoachId)
      const updated = await fetchCoachingClients()
      setClients(updated)
    } catch (err) {
      console.error('Reassign coach error:', err)
    }
  }

  useEffect(() => {
    try { localStorage.setItem('crm_coaching_view', view) } catch { /* noop */ }
  }, [view])

  const filtered = clients
    .filter((c) => !filter || c.status === filter)
    .filter((c) => {
      if (!search) return true
      const s = search.toLowerCase()
      return (
        c.profile?.name?.toLowerCase().includes(s) ||
        c.profile?.email?.toLowerCase().includes(s)
      )
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl text-foreground">{t('coaching.title')}</h1>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {([
            { mode: 'cards' as const, icon: LayoutGrid },
            { mode: 'table' as const, icon: Table2 },
            { mode: 'kanban' as const, icon: Columns3 },
          ]).map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`p-2 rounded-md transition-colors ${
                view === mode
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t(`coaching.view.${mode}`)}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
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
            placeholder={t('coaching.search')}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* Views */}
      {view === 'cards' && <CardsView clients={filtered} crmUsers={crmUsers} onReassign={handleReassignCoach} t={t} />}
      {view === 'table' && <TableView clients={filtered} crmUsers={crmUsers} onReassign={handleReassignCoach} t={t} />}
      {view === 'kanban' && <KanbanView clients={clients} search={search} crmUsers={crmUsers} onReassign={handleReassignCoach} t={t} />}

      {view !== 'kanban' && filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">{t('coaching.noClients')}</p>
      )}
    </div>
  )
}

/* ─── Cards View ─── */
function CardsView({ clients, crmUsers, onReassign, t }: {
  clients: CoachingClient[]; crmUsers: CrmUserRow[];
  onReassign: (profileId: string, coachId: string | null) => void; t: (k: string) => string
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <div
          key={client.id}
          className="bg-card rounded-xl border border-border p-5 hover:border-primary/50 transition-colors"
        >
          <Link to={`/coaching/${client.profile_id}`}>
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
              <StatusBadge status={client.status} t={t} />
              <span className="text-xs text-muted-foreground">
                {new Date(client.start_date).toLocaleDateString()}
              </span>
            </div>
          </Link>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium">{t('coaching.coach')}:</span>
            <select
              value={client.coach_id || ''}
              onChange={(e) => { e.stopPropagation(); onReassign(client.profile_id, e.target.value || null) }}
              className="text-xs px-1.5 py-0.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">{t('coaching.noCoachAssigned')}</option>
              {crmUsers.filter(u => u.active).map((u) => (
                <option key={u.id} value={u.id}>{u.name || u.email}</option>
              ))}
            </select>
          </div>
          {client.coaching_package && (
            <p className="mt-1 text-xs text-muted-foreground">
              {client.coaching_package}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

/* ─── Table View ─── */
function TableView({ clients, crmUsers, onReassign, t }: {
  clients: CoachingClient[]; crmUsers: CrmUserRow[];
  onReassign: (profileId: string, coachId: string | null) => void; t: (k: string) => string
}) {
  return (
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
                {t('coaching.coach')}
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('coaching.package')}
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('coaching.startDate')}
              </th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('coaching.checkInFrequency')}
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <Link
                    to={`/coaching/${client.profile_id}`}
                    className="text-sm font-medium text-foreground hover:text-primary"
                  >
                    {client.profile?.name || '—'}
                  </Link>
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  {client.profile?.email || '—'}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={client.status} t={t} />
                </td>
                <td className="px-5 py-3">
                  <select
                    value={client.coach_id || ''}
                    onChange={(e) => onReassign(client.profile_id, e.target.value || null)}
                    className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">{t('coaching.noCoachAssigned')}</option>
                    {crmUsers.filter(u => u.active).map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  {client.coaching_package || '—'}
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  {new Date(client.start_date).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  {client.check_in_frequency || '—'}
                </td>
                <td className="px-3 py-3">
                  <Link to={`/coaching/${client.profile_id}`}>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Kanban View ─── */
function KanbanView({
  clients,
  search,
  crmUsers,
  onReassign,
  t,
}: {
  clients: CoachingClient[]
  search: string
  crmUsers: CrmUserRow[]
  onReassign: (profileId: string, coachId: string | null) => void
  t: (k: string) => string
}) {
  const searchFiltered = search
    ? clients.filter((c) => {
        const s = search.toLowerCase()
        return c.profile?.name?.toLowerCase().includes(s) || c.profile?.email?.toLowerCase().includes(s)
      })
    : clients

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {KANBAN_COLUMNS.map(({ status, color }) => {
        const col = searchFiltered.filter((c) => c.status === status)
        return (
          <div key={status} className={`rounded-xl border-t-4 ${color} bg-muted/30 p-3 min-h-[200px]`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                {t(`coaching.${status}`)}
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {col.length}
              </span>
            </div>
            <div className="space-y-2">
              {col.map((client) => (
                <div
                  key={client.id}
                  className="bg-card rounded-lg border border-border p-3 hover:border-primary/50 transition-colors"
                >
                  <Link to={`/coaching/${client.profile_id}`}>
                    <p className="text-sm font-medium text-foreground truncate">
                      {client.profile?.name || client.profile?.email || 'Client'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{client.profile?.email}</p>
                  </Link>
                  <select
                    value={client.coach_id || ''}
                    onChange={(e) => onReassign(client.profile_id, e.target.value || null)}
                    className="mt-1 w-full text-xs px-1.5 py-0.5 rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 truncate"
                  >
                    <option value="">{t('coaching.noCoachAssigned')}</option>
                    {crmUsers.filter(u => u.active).map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(client.start_date).toLocaleDateString()}
                    </span>
                    {client.coaching_package && (
                      <span className="text-xs text-muted-foreground">
                        {client.coaching_package}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {col.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">{t('coaching.noClients')}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Shared Components ─── */
function StatusBadge({ status, t }: { status: string; t: (k: string) => string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'}`}>
      {t(`coaching.${status}`)}
    </span>
  )
}
