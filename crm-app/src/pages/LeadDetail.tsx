import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchLeadById,
  updateLeadStatus,
  addLeadNote,
  fetchLeadActivity,
  type LeadStatusValue,
} from '@/lib/leads'
import {
  ArrowLeft, Loader2, Send, User, Utensils, HeartPulse,
  Activity, Shield, Clock,
} from 'lucide-react'

const TABS = ['profile', 'nutrition', 'coaching', 'activity', 'consent'] as const
type TabKey = (typeof TABS)[number]

const TAB_ICONS: Record<TabKey, typeof User> = {
  profile: User,
  nutrition: Utensils,
  coaching: HeartPulse,
  activity: Activity,
  consent: Shield,
}

const STATUS_OPTIONS: LeadStatusValue[] = [
  'new', 'contacted', 'qualified', 'coaching_active',
  'coaching_paused', 'coaching_completed', 'inactive', 'opted_out',
]

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [lead, setLead] = useState<Record<string, unknown> | null>(null)
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    loadLead()
  }, [id])

  async function loadLead() {
    if (!id) return
    setLoading(true)
    try {
      const [data, acts] = await Promise.all([
        fetchLeadById(id),
        fetchLeadActivity(id),
      ])
      setLead(data as Record<string, unknown>)
      setActivities(acts as Record<string, unknown>[])
    } catch (err) {
      console.error('Load lead error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatus: LeadStatusValue) {
    if (!id || !user) return
    setSaving(true)
    try {
      await updateLeadStatus(id, newStatus, user.id)
      await loadLead()
    } catch (err) {
      console.error('Status update error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddNote() {
    if (!id || !user || !noteText.trim()) return
    setSaving(true)
    try {
      await addLeadNote(id, noteText.trim(), user.id)
      setNoteText('')
      const acts = await fetchLeadActivity(id)
      setActivities(acts as Record<string, unknown>[])
    } catch (err) {
      console.error('Add note error:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!lead) {
    return <p className="text-center text-muted-foreground py-20">{t('common.noData')}</p>
  }

  const profile = lead.profile as Record<string, unknown> | null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/leads" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="font-serif text-2xl text-foreground">
            {(profile?.name as string) || (profile?.email as string) || 'Lead'}
          </h1>
          <p className="text-sm text-muted-foreground">{profile?.email as string}</p>
        </div>

        {/* Status dropdown */}
        <select
          value={lead.status as string}
          onChange={(e) => handleStatusChange(e.target.value as LeadStatusValue)}
          disabled={saving}
          className="px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{t(`leads.status.${s}`)}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab]
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(`leadDetail.tabs.${tab}`)}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="bg-card rounded-xl border border-border p-6">
        {activeTab === 'profile' && (
          <ProfileTab profile={profile} />
        )}
        {activeTab === 'nutrition' && (
          <NutritionTab profile={profile} />
        )}
        {activeTab === 'activity' && (
          <div>
            {/* Add note */}
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t('leadDetail.notePlaceholder')}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
              />
              <button
                onClick={handleAddNote}
                disabled={saving || !noteText.trim()}
                className="px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Activity timeline */}
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act.id as string}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium capitalize">
                        {(act.activity_type as string)?.replace(/_/g, ' ')}
                      </span>
                    </p>
                    {act.notes ? (
                      <p className="text-sm text-muted-foreground mt-0.5">{String(act.notes)}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(act.created_at as string).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  {t('leadDetail.noActivity')}
                </p>
              )}
            </div>
          </div>
        )}
        {activeTab === 'coaching' && (
          <p className="text-muted-foreground text-center py-8">Coaching details coming soon</p>
        )}
        {activeTab === 'consent' && (
          <ConsentTab profile={profile} />
        )}
      </div>
    </div>
  )
}

function ProfileTab({ profile }: { profile: Record<string, unknown> | null }) {
  if (!profile) return <p className="text-muted-foreground">No profile data</p>

  const fields = [
    ['Name', profile.name],
    ['Email', profile.email],
    ['Language', profile.language],
    ['Gender', profile.gender],
    ['Age', profile.age],
    ['Weight', profile.weight ? `${profile.weight} kg` : null],
    ['Height', profile.height ? `${profile.height} cm` : null],
    ['Activity Level', profile.activity_level],
    ['Created', profile.created_at ? new Date(profile.created_at as string).toLocaleDateString() : null],
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(([label, value]) => (
        <div key={label as string}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label as string}</p>
          <p className="text-sm font-medium text-foreground">{(value as string) || '—'}</p>
        </div>
      ))}
    </div>
  )
}

function NutritionTab({ profile }: { profile: Record<string, unknown> | null }) {
  if (!profile) return <p className="text-muted-foreground">No nutrition data</p>

  const fields = [
    ['BMR', profile.bmr ? `${profile.bmr} kcal` : null],
    ['TDEE', profile.tdee ? `${profile.tdee} kcal` : null],
    ['Daily Calories', profile.daily_calories ? `${profile.daily_calories} kcal` : null],
    ['Diet Type', profile.diet_type],
    ['Fasting Protocol', profile.fasting_protocol],
    ['Meals Per Day', profile.meals_per_day],
    ['Weight Goal', profile.weight_goal ? `${profile.weight_goal} kg` : null],
    ['Prep Time', profile.prep_time],
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(([label, value]) => (
        <div key={label as string}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label as string}</p>
          <p className="text-sm font-medium text-foreground">{(value as string) || '—'}</p>
        </div>
      ))}
    </div>
  )
}

function ConsentTab({ profile }: { profile: Record<string, unknown> | null }) {
  if (!profile) return <p className="text-muted-foreground">No consent data</p>

  const consents = [
    ['GDPR Consent', profile.gdpr_consent],
    ['Marketing Consent', profile.marketing_consent],
    ['Newsletter Consent', profile.newsletter_consent],
    ['Coaching Contact Consent', profile.coaching_contact_consent],
  ]

  return (
    <div className="space-y-3">
      {consents.map(([label, value]) => (
        <div key={label as string} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm text-foreground">{label as string}</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              value ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
            }`}
          >
            {value ? 'Yes' : 'No'}
          </span>
        </div>
      ))}
    </div>
  )
}
