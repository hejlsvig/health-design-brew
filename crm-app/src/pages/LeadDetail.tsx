import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { updateLeadStatus, addLeadNote, fetchLeadActivity, assignLead, type LeadStatusValue } from '@/lib/leads'
import { fetchCrmUsers, type CrmUserRow } from '@/lib/crmUsers'
import {
  fetchFullPersonData,
  fetchCheckinsForCoachingClient,
  type FullPersonData,
  type WeeklyCheckin,
  type SubscriberInfo,
} from '@/lib/fullPersonView'
import { activateCoaching, activateSubscriberCoaching } from '@/lib/coaching'
import EditableProfileForm from '@/components/forms/EditableProfileForm'
import SubscriptionTab from '@/components/tabs/SubscriptionTab'
import EmailHistoryTab from '@/components/tabs/EmailHistoryTab'
import MealPlansTab from '@/components/tabs/MealPlansTab'
import FavoritesTab from '@/components/tabs/FavoritesTab'
import PaymentTab from '@/components/tabs/PaymentTab'
import {
  ArrowLeft, Loader2, Send, User, Utensils, HeartPulse,
  Activity, Shield, CreditCard, Mail, FileText, Heart, Wallet,
  Clock, Crown, Zap, Star,
} from 'lucide-react'

const TABS = [
  'profile', 'nutrition', 'coaching', 'subscription',
  'emailHistory', 'mealPlans', 'favorites', 'payment',
  'activity', 'consent',
] as const
type TabKey = (typeof TABS)[number]

const TAB_ICONS: Record<TabKey, typeof User> = {
  profile: User,
  nutrition: Utensils,
  coaching: HeartPulse,
  subscription: CreditCard,
  emailHistory: Mail,
  mealPlans: FileText,
  favorites: Heart,
  payment: Wallet,
  activity: Activity,
  consent: Shield,
}

const STATUS_OPTIONS: LeadStatusValue[] = [
  'new', 'contacted', 'qualified', 'coaching_active',
  'coaching_paused', 'coaching_completed', 'inactive', 'opted_out',
]

const TIER_ICONS: Record<string, typeof Star> = {
  free: Star,
  premium: Crown,
  pro: Zap,
}

const TIER_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  premium: 'bg-amber-100 text-amber-700',
  pro: 'bg-purple-100 text-purple-700',
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [data, setData] = useState<FullPersonData | null>(null)
  const [activities, setActivities] = useState<Record<string, unknown>[]>([])
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [crmUsers, setCrmUsers] = useState<CrmUserRow[]>([])
  const [checkinsLoaded, setCheckinsLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [loading, setLoading] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    loadData()
    fetchCrmUsers().then(setCrmUsers).catch(() => {})
  }, [id])

  // Lazy load checkins when coaching tab is opened
  useEffect(() => {
    if (activeTab === 'coaching' && !checkinsLoaded && data?.coaching?.id) {
      loadCheckins(data.coaching.id)
    }
  }, [activeTab, data?.coaching?.id])

  async function loadData() {
    if (!id) return
    setLoading(true)
    try {
      const [personData, acts] = await Promise.all([
        fetchFullPersonData(id),
        fetchLeadActivity(id),
      ])
      setData(personData)
      setActivities(acts as Record<string, unknown>[])
    } catch (err) {
      console.error('Load person data error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadCheckins(coachingId: string) {
    try {
      const result = await fetchCheckinsForCoachingClient(coachingId)
      setCheckins(result)
      setCheckinsLoaded(true)
    } catch (err) {
      console.error('Load checkins error:', err)
    }
  }

  async function handleStatusChange(newStatus: LeadStatusValue) {
    if (!id || !user) return
    setSaving(true)
    try {
      await updateLeadStatus(id, newStatus, user.id)
      await loadData()
    } catch (err) {
      console.error('Status update error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleAssignLead(coachId: string | null) {
    if (!id) return
    setSaving(true)
    try {
      await assignLead(id, coachId)
      await loadData()
    } catch (err) {
      console.error('Assign lead error:', err)
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

  if (!data?.profile && !data?.subscriber) {
    return <p className="text-center text-muted-foreground py-20">{t('common.noData')}</p>
  }

  const { profile, subscriber, isSubscriberOnly, subscription, coaching } = data
  const displayName = profile?.name || subscriber?.name || profile?.email || subscriber?.email || 'Lead'
  const displayEmail = profile?.email || subscriber?.email || ''
  const tier = subscription?.tier || 'free'
  const TierIcon = TIER_ICONS[tier] || Star

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/leads" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl text-foreground">
              {displayName}
            </h1>
            {isSubscriberOnly ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                <User className="w-3 h-3" />
                GÆST
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[tier]}`}>
                <TierIcon className="w-3 h-3" />
                {tier}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{displayEmail}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{t('leads.columns.assignedTo')}:</span>
            <select
              value={data.leadStatus?.assigned_to || ''}
              onChange={(e) => handleAssignLead(e.target.value || null)}
              disabled={saving}
              className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">{t('leads.unassigned')}</option>
              {crmUsers.filter(u => u.active).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status dropdown */}
        <select
          value={data.leadStatus?.status || 'new'}
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
          isSubscriberOnly && subscriber ? (
            <SubscriberProfileTab subscriber={subscriber} />
          ) : profile ? (
            <EditableProfileForm profile={profile} onUpdate={loadData} />
          ) : null
        )}

        {activeTab === 'nutrition' && (
          profile ? <NutritionTab profile={profile} /> : (
            <p className="text-center text-muted-foreground py-8">Ingen ernæringsdata — gæst-profil</p>
          )
        )}

        {activeTab === 'coaching' && (
          <CoachingTab
            coaching={coaching}
            checkins={checkins}
            personId={id!}
            isSubscriberOnly={data.isSubscriberOnly}
            coaches={crmUsers.filter(u => u.active)}
            onActivated={loadData}
          />
        )}

        {activeTab === 'subscription' && (
          profile ? (
            <SubscriptionTab
              subscription={subscription}
              profileId={profile.id}
              onUpdate={loadData}
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">Ingen abonnement — gæst-profil</p>
          )
        )}

        {activeTab === 'emailHistory' && (
          <EmailHistoryTab emails={data.emailHistory} />
        )}

        {activeTab === 'mealPlans' && (
          <MealPlansTab mealPlans={data.mealPlans} />
        )}

        {activeTab === 'favorites' && (
          <FavoritesTab favorites={data.favorites} />
        )}

        {activeTab === 'payment' && (
          <PaymentTab coaching={coaching} />
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

        {activeTab === 'consent' && (
          profile ? (
            <ConsentTab consentLog={data.consentLog} profile={profile} />
          ) : subscriber ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-foreground">GDPR Consent</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${subscriber.gdpr_consent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {subscriber.gdpr_consent ? 'Ja' : 'Nej'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-foreground">Nyhedsbrev</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${subscriber.subscribed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {subscriber.subscribed ? 'Ja' : 'Nej'}
                  </span>
                </div>
              </div>

              {/* Consent log history */}
              {data.consentLog.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Samtykke-historik</h3>
                  <div className="space-y-2">
                    {data.consentLog.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">
                            {entry.consent_type.replace(/_/g, ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.source && <span className="mr-2">Kilde: {entry.source}</span>}
                            {new Date(entry.created_at).toLocaleString('da-DK')}
                          </p>
                          {entry.notes && <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {entry.granted ? 'Ja' : 'Nej'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───

function NutritionTab({ profile }: { profile: NonNullable<FullPersonData['profile']> }) {
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
          <p className="text-sm font-medium text-foreground">{String(value ?? '—')}</p>
        </div>
      ))}
    </div>
  )
}

function CoachingTab({ coaching, checkins, personId, isSubscriberOnly, coaches, onActivated }: {
  coaching: FullPersonData['coaching']
  checkins: WeeklyCheckin[]
  personId: string
  isSubscriberOnly: boolean
  coaches: CrmUserRow[]
  onActivated: () => void
}) {
  const { t } = useTranslation()
  const [activating, setActivating] = useState(false)
  const [selectedCoach, setSelectedCoach] = useState('')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [showActivateForm, setShowActivateForm] = useState(false)

  async function handleActivate() {
    setActivating(true)
    try {
      const opts = {
        coachId: selectedCoach || undefined,
        package: selectedPackage || undefined,
        frequency: 'weekly',
      }
      if (isSubscriberOnly) {
        await activateSubscriberCoaching(personId, opts)
      } else {
        await activateCoaching(personId, opts)
      }
      onActivated()
    } catch (err) {
      console.error('Activate coaching error:', err)
    } finally {
      setActivating(false)
      setShowActivateForm(false)
    }
  }

  if (!coaching) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <HeartPulse className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">{t('coaching.noClients')}</p>

        {!showActivateForm ? (
          <button
            onClick={() => setShowActivateForm(true)}
            className="px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors font-medium text-sm"
          >
            Aktivér som coaching-klient
          </button>
        ) : (
          <div className="w-full max-w-md space-y-4 p-4 rounded-lg border border-border bg-card">
            <h3 className="font-semibold text-foreground">Aktivér coaching</h3>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Coach</label>
              <select
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="">Ingen coach tildelt</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.name || c.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">Pakke</label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                <option value="">Ingen pakke valgt</option>
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleActivate}
                disabled={activating}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {activating ? 'Aktiverer...' : 'Bekræft aktivering'}
              </button>
              <button
                onClick={() => setShowActivateForm(false)}
                className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm"
              >
                Annuller
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Coaching info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
          <p className="text-sm font-medium capitalize text-foreground">{coaching.status}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Check-in Frequency</p>
          <p className="text-sm font-medium text-foreground">{coaching.check_in_frequency || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Start Date</p>
          <p className="text-sm font-medium text-foreground">
            {coaching.start_date ? new Date(coaching.start_date).toLocaleDateString() : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">End Date</p>
          <p className="text-sm font-medium text-foreground">
            {coaching.end_date ? new Date(coaching.end_date).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>

      {/* Check-ins list */}
      {checkins.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('coaching.title')} — Check-ins ({checkins.length})
          </h3>
          <div className="space-y-2">
            {checkins.map((ci) => (
              <div key={ci.id} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium text-foreground">
                    {ci.weight ? `${ci.weight} kg` : '—'}
                  </span>
                  {ci.mood != null && (
                    <span className="text-muted-foreground">Mood: {ci.mood}/10</span>
                  )}
                  {ci.energy != null && (
                    <span className="text-muted-foreground">Energy: {ci.energy}/10</span>
                  )}
                  {ci.sleep_hours != null && (
                    <span className="text-muted-foreground">Sleep: {ci.sleep_hours}h</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(ci.created_at).toLocaleDateString()}
                  </span>
                </div>
                {ci.weekly_win && (
                  <p className="text-xs text-green-600 mt-1">Win: {ci.weekly_win}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SubscriberProfileTab({ subscriber }: { subscriber: SubscriberInfo }) {
  const fields = [
    ['Email', subscriber.email],
    ['Navn', subscriber.name],
    ['Kilde', subscriber.source],
    ['Sprog', subscriber.language],
    ['GDPR', subscriber.gdpr_consent ? 'Ja' : 'Nej'],
    ['Abonnerer', subscriber.subscribed ? 'Ja' : 'Nej'],
    ['Oprettet', subscriber.created_at ? new Date(subscriber.created_at).toLocaleString() : '—'],
  ]

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Denne person er en gæst (subscriber) — ikke en registreret bruger. Data stammer fra nyhedsbrev eller kostplan-generering.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(([label, value]) => (
          <div key={label as string}>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label as string}</p>
            <p className="text-sm font-medium text-foreground">{String(value ?? '—')}</p>
          </div>
        ))}
      </div>
      {subscriber.tags && subscriber.tags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {subscriber.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ConsentTab({ consentLog, profile }: { consentLog: FullPersonData['consentLog']; profile: NonNullable<FullPersonData['profile']> }) {
  const { t } = useTranslation()

  const currentConsents = [
    ['GDPR Consent', profile.gdpr_consent],
    ['Marketing Consent', profile.marketing_consent],
    ['Newsletter Consent', profile.newsletter_consent],
    ['Coaching Contact Consent', profile.coaching_contact_consent],
  ]

  return (
    <div className="space-y-6">
      {/* Current consent status */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('leadDetail.tabs.consent')}
        </h3>
        <div className="space-y-2">
          {currentConsents.map(([label, value]) => (
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
      </div>

      {/* Consent log */}
      {consentLog.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Consent Log ({consentLog.length})
          </h3>
          <div className="space-y-2">
            {consentLog.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{entry.consent_type}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                      entry.granted ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {entry.granted ? 'Granted' : 'Revoked'}
                    </span>
                  </p>
                  {entry.source && (
                    <p className="text-xs text-muted-foreground mt-0.5">Source: {entry.source}</p>
                  )}
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
