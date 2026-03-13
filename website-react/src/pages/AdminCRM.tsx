import { useEffect, useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Users, Target, Dumbbell, Search,
  ChevronRight, ArrowUpDown, Mail
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchCrmStats, fetchSubscribers, fetchUnifiedLeads,
  statusLabel, statusColor,
  type LeadStatusValue, type LeadSource, type CrmStats, type SubscriberRow, type UnifiedLeadRow
} from '@/lib/crm'

export default function AdminCRM() {
  const { t } = useTranslation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [unifiedLeads, setUnifiedLeads] = useState<UnifiedLeadRow[]>([])
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([])
  const [stats, setStats] = useState<CrmStats & { totalSubscribers: number }>({ totalLeads: 0, newThisWeek: 0, qualified: 0, activeCoaching: 0, totalSubscribers: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<LeadStatusValue | ''>('')
  const [filterSource, setFilterSource] = useState<LeadSource | ''>('')
  const [sortBy, setSortBy] = useState<'created_at' | 'lead_score' | 'last_contact_date'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'leads' | 'subscribers'>('leads')

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/login')
  }, [user, isAdmin, authLoading, navigate])

  useEffect(() => {
    if (!isAdmin) return
    loadData()
  }, [isAdmin])

  const loadData = async () => {
    setLoading(true)
    try {
      const [unifiedData, statsData, subsData] = await Promise.all([
        fetchUnifiedLeads(),
        fetchCrmStats(),
        fetchSubscribers(),
      ])
      setUnifiedLeads(unifiedData)
      setStats({ ...statsData, totalLeads: unifiedData.length })
      setSubscribers(subsData)
    } catch (err) {
      console.error('CRM load error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filtered + sorted unified leads
  const filteredLeads = useMemo(() => {
    let result = [...unifiedLeads]

    if (filterStatus) result = result.filter(l => l.status === filterStatus)
    if (filterSource) result = result.filter(l => l.source === filterSource)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(l =>
        l.email?.toLowerCase().includes(s) || l.name?.toLowerCase()?.includes(s)
      )
    }

    result.sort((a, b) => {
      let aVal: any, bVal: any
      if (sortBy === 'lead_score') {
        aVal = a.lead_score; bVal = b.lead_score
      } else if (sortBy === 'last_contact_date') {
        aVal = a.last_contact_date || ''; bVal = b.last_contact_date || ''
      } else {
        aVal = a.created_at; bVal = b.created_at
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [unifiedLeads, filterStatus, filterSource, search, sortBy, sortDir])

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  if (!isAdmin) return null

  // Filtered subscribers
  const filteredSubs = useMemo(() => {
    let result = [...subscribers]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(r =>
        r.email?.toLowerCase().includes(s) || r.name?.toLowerCase().includes(s),
      )
    }
    if (filterSource) {
      result = result.filter(r => r.source === filterSource)
    }
    return result
  }, [subscribers, search, filterSource])

  const statCards = [
    { icon: <Users className="h-5 w-5" />, label: 'Total leads', value: stats.totalLeads, color: 'text-primary' },
    { icon: <Mail className="h-5 w-5" />, label: 'Subscribers', value: stats.totalSubscribers, color: 'text-indigo-600' },
    { icon: <Target className="h-5 w-5" />, label: 'Kvalificerede', value: stats.qualified, color: 'text-green-600' },
    { icon: <Dumbbell className="h-5 w-5" />, label: 'Aktiv coaching', value: stats.activeCoaching, color: 'text-accent' },
  ]

  const allStatuses: LeadStatusValue[] = [
    'new', 'contacted', 'qualified', 'coaching_active',
    'coaching_paused', 'coaching_completed', 'inactive', 'opted_out'
  ]
  const allSources: LeadSource[] = ['calculator', 'newsletter', 'website_signup', 'meal_plan', 'manual', 'imported']

  return (
    <div className="container py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">CRM & Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Administrer leads, brugere og coaching-pipeline
          </p>
        </div>
        <Link
          to="/admin"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Admin
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(card => (
          <div key={card.label} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={card.color}>{card.icon}</span>
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>
              {loading ? '–' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setActiveTab('leads')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'leads'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Leads ({unifiedLeads.length})
        </button>
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'subscribers'
              ? 'border-accent text-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Subscribers ({subscribers.length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Søg på navn eller email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {activeTab === 'leads' && (
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as LeadStatusValue | '')}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm"
          >
            <option value="">Alle statuser</option>
            {allStatuses.map(s => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
        )}

        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value as LeadSource | '')}
          className="h-9 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">Alle kilder</option>
          {allSources.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Leads Table */}
      {activeTab === 'leads' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Ingen leads fundet.
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Bruger</th>
                    <th className="text-left px-4 py-3 font-medium">Kilde</th>
                    <th className="text-left px-4 py-3 font-medium">
                      <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-foreground">
                        Status <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      <button onClick={() => toggleSort('lead_score')} className="flex items-center gap-1 hover:text-foreground">
                        Score <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">
                      <button onClick={() => toggleSort('last_contact_date')} className="flex items-center gap-1 hover:text-foreground">
                        Sidst kontakt <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Samtykke</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredLeads.map(lead => (
                    <tr
                      key={lead.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => {
                        if (lead.origin === 'auth' && lead.user_id) {
                          navigate(`/admin/crm/${lead.user_id}`)
                        } else if (lead.origin === 'subscriber' && lead.subscriber_id) {
                          navigate(`/admin/crm/${lead.subscriber_id}`)
                        }
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium">
                              {lead.name || 'Ingen navn'}
                              {lead.origin === 'subscriber' && (
                                <span className="ml-1.5 text-[10px] font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="Gæst-lead (ikke logget ind)">GÆST</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{lead.source}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(lead.status)}`}>
                          {statusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent transition-all"
                              style={{ width: `${lead.lead_score}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{lead.lead_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {lead.last_contact_date
                          ? new Date(lead.last_contact_date).toLocaleDateString('da-DK')
                          : '–'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex gap-1">
                          {lead.newsletter_consent && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded" title="Nyhedsbrev">NB</span>
                          )}
                          {lead.marketing_consent && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title="Marketing">MK</span>
                          )}
                          {lead.coaching_contact_consent && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded" title="Coaching kontakt">CO</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {lead.origin === 'auth' ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Viser {filteredLeads.length} af {unifiedLeads.length} leads
          </p>
        </>
      )}

      {/* Subscribers Table */}
      {activeTab === 'subscribers' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
          ) : filteredSubs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Ingen subscribers fundet.
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Subscriber</th>
                    <th className="text-left px-4 py-3 font-medium">Kilde</th>
                    <th className="text-left px-4 py-3 font-medium">Sprog</th>
                    <th className="text-left px-4 py-3 font-medium">Tags</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Oprettet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSubs.map(sub => (
                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{sub.name || 'Ingen navn'}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{sub.source}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{sub.language?.toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {sub.tags?.map(tag => (
                            <span
                              key={tag}
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                tag === 'newsletter' ? 'bg-green-100 text-green-700' :
                                tag === 'contact_ok' ? 'bg-purple-100 text-purple-700' :
                                tag === 'meal_plan' ? 'bg-amber-100 text-amber-700' :
                                'bg-muted text-muted-foreground'
                              }`}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          sub.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {sub.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString('da-DK')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Viser {filteredSubs.length} af {subscribers.length} subscribers
          </p>
        </>
      )}
    </div>
  )
}
