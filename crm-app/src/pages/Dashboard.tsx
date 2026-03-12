import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { fetchDashboardStats, type DashboardStats } from '@/lib/stats'
import { fetchLeads, type UnifiedLeadRow } from '@/lib/leads'
import {
  Users,
  UserPlus,
  Award,
  HeartPulse,
  ArrowRight,
  Loader2,
} from 'lucide-react'

export default function Dashboard() {
  const { t } = useTranslation()
  const { crmUser } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentLeads, setRecentLeads] = useState<UnifiedLeadRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [s, leads] = await Promise.all([
          fetchDashboardStats(),
          fetchLeads(),
        ])
        setStats(s)
        setRecentLeads(leads.slice(0, 5))
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const statCards = [
    { label: t('dashboard.totalLeads'), value: stats?.totalLeads ?? 0, icon: Users, color: 'text-primary' },
    { label: t('dashboard.newThisWeek'), value: stats?.newThisWeek ?? 0, icon: UserPlus, color: 'text-success' },
    { label: t('dashboard.qualified'), value: stats?.qualified ?? 0, icon: Award, color: 'text-warning' },
    { label: t('dashboard.activeCoaching'), value: stats?.activeCoaching ?? 0, icon: HeartPulse, color: 'text-accent' },
  ]

  return (
    <div>
      {/* Welcome */}
      <h1 className="font-serif text-2xl text-foreground mb-6">
        {t('dashboard.welcome', { name: crmUser?.name || crmUser?.email || '' })}
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-card rounded-xl border border-border p-5 flex items-start gap-4"
          >
            <div className={`p-2.5 rounded-lg bg-muted ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent leads */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{t('dashboard.recentLeads')}</h2>
          <Link
            to="/leads"
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            {t('leads.title')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentLeads.map((lead) => {
            const inner = (
              <>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {lead.profile?.name || lead.profile?.email || 'Unknown'}
                    {lead.origin === 'subscriber' && (
                      <span className="ml-1.5 text-[10px] font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        GÆST
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{lead.profile?.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={lead.status} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </>
            )

            return lead.origin === 'auth' ? (
              <Link
                key={lead.user_id}
                to={`/leads/${lead.user_id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
              >
                {inner}
              </Link>
            ) : (
              <div
                key={lead.user_id}
                className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors"
              >
                {inner}
              </div>
            )
          })}
          {recentLeads.length === 0 && (
            <p className="px-5 py-8 text-center text-muted-foreground text-sm">
              {t('leads.noLeads')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()

  const colors: Record<string, string> = {
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
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
        colors[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {t(`leads.status.${status}`, status)}
    </span>
  )
}
