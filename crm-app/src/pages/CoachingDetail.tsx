import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  fetchFullPersonData,
  fetchCheckinsForCoachingClient,
  type FullPersonData,
  type WeeklyCheckin,
  type CoachingInfo,
} from '@/lib/fullPersonView'
import { sendCheckinEmail } from '@/lib/checkins'
import { activateCoaching, assignCoach, updateCoachingStatus, type CoachingClient } from '@/lib/coaching'
import { fetchCrmUsers, type CrmUserRow } from '@/lib/crmUsers'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchNotes, createNote, deleteNote, togglePinNote,
  type CrmNote, type NoteCategory, NOTE_CATEGORIES, CATEGORY_COLORS,
} from '@/lib/notes'
import EditableProfileForm from '@/components/forms/EditableProfileForm'
import EmailHistoryTab from '@/components/tabs/EmailHistoryTab'
import MealPlansTab from '@/components/tabs/MealPlansTab'
import PaymentTab from '@/components/tabs/PaymentTab'
import {
  ArrowLeft, Loader2, HeartPulse, User, Mail, FileText,
  Activity, Wallet, ClipboardCheck, TrendingUp, TrendingDown,
  Minus, CalendarDays, Clock, Trophy, Moon, Zap, Brain,
  ChevronDown, ChevronUp, Plus, StickyNote, Pin, PinOff, Trash2,
  Send, Check, X,
} from 'lucide-react'

const TABS = ['profile', 'checkins', 'notes', 'emailHistory', 'mealPlans', 'payment'] as const
type TabKey = (typeof TABS)[number]

const TAB_ICONS: Record<TabKey, typeof User> = {
  profile: User,
  checkins: ClipboardCheck,
  notes: StickyNote,
  emailHistory: Mail,
  mealPlans: FileText,
  payment: Wallet,
}

export default function CoachingDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [data, setData] = useState<FullPersonData | null>(null)
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [notes, setNotes] = useState<CrmNote[]>([])
  const [crmUsers, setCrmUsers] = useState<CrmUserRow[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('profile')
  const [loading, setLoading] = useState(true)
  const [expandedCheckin, setExpandedCheckin] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    loadData()
    fetchCrmUsers().then(setCrmUsers).catch(() => {})
  }, [id])

  async function loadData() {
    if (!id) return
    setLoading(true)
    try {
      const personData = await fetchFullPersonData(id)
      setData(personData)

      // Load checkins + notes eagerly for coaching detail
      const [ci, userNotes] = await Promise.all([
        personData.coaching?.id
          ? fetchCheckinsForCoachingClient(personData.coaching.id)
          : Promise.resolve([]),
        fetchNotes({ leadId: id }),
      ])
      setCheckins(ci)
      setNotes(userNotes)
    } catch (err) {
      console.error('Load coaching detail error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAssignCoach(coachId: string | null) {
    if (!id) return
    try {
      await assignCoach(id, coachId)
      await loadData()
    } catch (err) {
      console.error('Assign coach error:', err)
    }
  }

  async function handleStatusChange(newStatus: CoachingClient['status']) {
    if (!id) return
    try {
      await updateCoachingStatus(id, newStatus)
      await loadData()
    } catch (err) {
      console.error('Update coaching status error:', err)
    }
  }

  async function handleActivateCoaching() {
    if (!id) return
    try {
      await activateCoaching(id)
      await loadData()
    } catch (err) {
      console.error('Activate coaching error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data?.profile) {
    return <p className="text-center text-muted-foreground py-20">{t('common.noData')}</p>
  }

  const { profile, coaching } = data

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link to="/coaching" className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl text-foreground">
              {profile.name || profile.email || 'Client'}
            </h1>
            {coaching && (
              <select
                value={coaching.status}
                onChange={(e) => handleStatusChange(e.target.value as CoachingClient['status'])}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                  coaching.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : coaching.status === 'completed'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                <option value="active">{t('coaching.active')}</option>
                <option value="inactive">{t('coaching.inactive')}</option>
                <option value="completed">{t('coaching.completed')}</option>
              </select>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          {coaching && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">{t('coaching.coach')}:</span>
              <select
                value={coaching.coach_id || ''}
                onChange={(e) => handleAssignCoach(e.target.value || null)}
                className="text-xs px-2 py-1 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">{t('coaching.noCoachAssigned')}</option>
                {crmUsers.filter(u => u.active).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} {u.sender_email ? `(${u.sender_email})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {!coaching && (
          <button
            onClick={handleActivateCoaching}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('coaching.activate')}
          </button>
        )}
      </div>

      {/* Summary cards */}
      {coaching && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            icon={CalendarDays}
            label={t('coaching.startDate')}
            value={coaching.start_date ? new Date(coaching.start_date).toLocaleDateString() : '—'}
          />
          <SummaryCard
            icon={Clock}
            label={t('coaching.checkInFrequency')}
            value={coaching.check_in_frequency || 'weekly'}
          />
          <SummaryCard
            icon={ClipboardCheck}
            label={t('coaching.totalCheckins')}
            value={String(checkins.length)}
          />
          <SummaryCard
            icon={TrendingDown}
            label={t('coaching.weightChange')}
            value={getWeightChange(checkins)}
            valueColor={getWeightChangeColor(checkins)}
          />
        </div>
      )}

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
              {t(`coaching.tabs.${tab}`)}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="bg-card rounded-xl border border-border p-6">
        {activeTab === 'profile' && (
          <div className="space-y-8">
            <OverviewTab coaching={coaching} checkins={checkins} profile={profile} />
            <div className="border-t border-border pt-8">
              <h3 className="text-sm font-semibold text-foreground mb-4">{t('coaching.tabs.profileEdit')}</h3>
              <EditableProfileForm profile={profile} onUpdate={loadData} />
            </div>
          </div>
        )}

        {activeTab === 'checkins' && (
          <CheckinsTab
            checkins={checkins}
            expandedId={expandedCheckin}
            onToggle={(cid) => setExpandedCheckin(expandedCheckin === cid ? null : cid)}
            coaching={coaching}
            coachId={user?.id}
          />
        )}

        {activeTab === 'notes' && (
          <NotesTab
            notes={notes}
            userId={id!}
            adminId={user?.id}
            onUpdate={async () => {
              const updated = await fetchNotes({ leadId: id })
              setNotes(updated)
            }}
          />
        )}

        {activeTab === 'emailHistory' && (
          <EmailHistoryTab emails={data.emailHistory} />
        )}

        {activeTab === 'mealPlans' && (
          <MealPlansTab
            mealPlans={data.mealPlans}
            profile={data.profile}
            coachId={user?.id}
            onPlanSent={loadData}
          />
        )}

        {activeTab === 'payment' && (
          <PaymentTab coaching={coaching} />
        )}
      </div>
    </div>
  )
}

// ─── Helper Components ───

function SummaryCard({
  icon: Icon,
  label,
  value,
  valueColor,
}: {
  icon: typeof Activity
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-semibold ${valueColor || 'text-foreground'}`}>{value}</p>
    </div>
  )
}

function OverviewTab({
  coaching,
  checkins,
  profile: _profile,
}: {
  coaching: FullPersonData['coaching']
  checkins: WeeklyCheckin[]
  profile: FullPersonData['profile']
}) {
  const { t } = useTranslation()

  if (!coaching) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <HeartPulse className="w-8 h-8" />
        <p>{t('coaching.notActive')}</p>
      </div>
    )
  }

  const latestCheckin = checkins[0] ?? null

  return (
    <div className="space-y-8">
      {/* Coaching details grid */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">{t('coaching.details')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoField label="Status" value={coaching.status} capitalize />
          <InfoField
            label={t('coaching.coach')}
            value={coaching.coach ? (coaching.coach.name || coaching.coach.email) : t('coaching.noCoachAssigned')}
          />
          <InfoField label={t('coaching.checkInFrequency')} value={coaching.check_in_frequency || 'weekly'} />
          <InfoField label={t('coaching.package')} value={coaching.coaching_package || '—'} />
          <InfoField
            label={t('coaching.startDate')}
            value={coaching.start_date ? new Date(coaching.start_date).toLocaleDateString() : '—'}
          />
          <InfoField
            label={t('coaching.endDate')}
            value={coaching.end_date ? new Date(coaching.end_date).toLocaleDateString() : '—'}
          />
          <InfoField
            label={t('coaching.reminders')}
            value={coaching.checkin_reminders_enabled ? 'Aktiv' : 'Deaktiveret'}
          />
        </div>
      </div>

      {/* Latest check-in snapshot */}
      {latestCheckin && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t('coaching.latestCheckin')}
            <span className="ml-2 text-xs text-muted-foreground font-normal">
              {new Date(latestCheckin.created_at).toLocaleDateString()}
            </span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              icon={TrendingDown}
              label={t('coaching.metrics.weight')}
              value={latestCheckin.weight ? `${latestCheckin.weight} kg` : '—'}
            />
            <MetricCard
              icon={Brain}
              label={t('coaching.metrics.mood')}
              value={latestCheckin.mood != null ? `${latestCheckin.mood}/10` : '—'}
            />
            <MetricCard
              icon={Zap}
              label={t('coaching.metrics.energy')}
              value={latestCheckin.energy != null ? `${latestCheckin.energy}/10` : '—'}
            />
            <MetricCard
              icon={Moon}
              label={t('coaching.metrics.sleep')}
              value={latestCheckin.sleep_hours != null ? `${latestCheckin.sleep_hours}h` : '—'}
            />
          </div>
          {latestCheckin.weekly_win && (
            <div className="mt-3 p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 text-green-700">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">{t('coaching.metrics.weeklyWin')}</span>
              </div>
              <p className="text-sm text-green-600 mt-1">{latestCheckin.weekly_win}</p>
            </div>
          )}
        </div>
      )}

      {/* Weight progress */}
      {checkins.length >= 2 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t('coaching.weightProgress')}</h3>
          <div className="space-y-2">
            {checkins
              .filter((ci) => ci.weight != null)
              .slice(0, 10)
              .map((ci, i, arr) => {
                const prev = arr[i + 1]
                const diff = prev?.weight && ci.weight ? ci.weight - prev.weight : null
                return (
                  <div key={ci.id} className="flex items-center gap-4 p-2 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground w-24">
                      {new Date(ci.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-sm font-medium text-foreground w-20">
                      {ci.weight} kg
                    </span>
                    {diff != null && (
                      <span
                        className={`flex items-center gap-1 text-xs font-medium ${
                          diff < 0 ? 'text-green-600' : diff > 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}
                      >
                        {diff < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : diff > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                      </span>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Notes */}
      {coaching.notes && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">{t('coaching.notes')}</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
            {coaching.notes}
          </p>
        </div>
      )}
    </div>
  )
}

function CheckinsTab({
  checkins,
  expandedId,
  onToggle,
  coaching,
  coachId,
}: {
  checkins: WeeklyCheckin[]
  expandedId: string | null
  onToggle: (id: string) => void
  coaching?: CoachingInfo | null
  coachId?: string | null
}) {
  const { t } = useTranslation()
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailMessage, setEmailMessage] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ success: boolean; error?: string; sent_to?: string } | null>(null)

  async function handleSendCheckinEmail() {
    if (!coaching?.id || !coachId) return
    setEmailSending(true)
    setEmailResult(null)
    try {
      const result = await sendCheckinEmail({
        coaching_client_id: coaching.id,
        coach_id: coachId,
        custom_message: emailMessage.trim() || undefined,
      })
      setEmailResult(result)
      if (result.success) {
        setTimeout(() => {
          setShowEmailModal(false)
          setEmailMessage('')
          setEmailResult(null)
        }, 3000)
      }
    } catch (err) {
      setEmailResult({ success: false, error: String(err) })
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Send check-in email button */}
      {coaching && coachId && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            {t('coaching.sendCheckinEmail', 'Send check-in email')}
          </button>
        </div>
      )}

      {/* Send check-in email modal */}
      {showEmailModal && coaching && coachId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEmailModal(false)}>
          <div
            className="bg-card rounded-xl border border-border shadow-xl max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 p-5 border-b border-border">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-serif font-semibold text-foreground">{t('coaching.sendCheckinEmail', 'Send check-in email')}</h2>
                <p className="text-sm text-muted-foreground">{t('coaching.checkinEmailDesc', 'Send en påmindelse om at udfylde check-in')}</p>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="p-2 rounded-lg hover:bg-muted transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('coaching.customMessage', 'Personlig besked (valgfrit)')}
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                  placeholder={t('coaching.customMessagePlaceholder', 'Skriv en personlig besked til klienten...')}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('coaching.checkinEmailNote', 'Emailen indeholder automatisk et link til check-in formularen.')}
                </p>
              </div>

              {emailResult && (
                <div className={`p-3 rounded-lg border ${
                  emailResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  {emailResult.success ? (
                    <div className="flex items-center gap-2 text-green-700">
                      <Check className="w-4 h-4" />
                      <span className="text-sm">{t('coaching.checkinEmailSent', 'Check-in email sendt!')} ({emailResult.sent_to})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-700">
                      <X className="w-4 h-4" />
                      <span className="text-sm">{emailResult.error}</span>
                    </div>
                  )}
                </div>
              )}

              {!emailResult?.success && (
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                  >
                    {t('common.cancel', 'Annuller')}
                  </button>
                  <button
                    onClick={handleSendCheckinEmail}
                    disabled={emailSending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors text-sm font-medium"
                  >
                    {emailSending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> {t('common.sending', 'Sender...')}</>
                    ) : (
                      <><Send className="w-4 h-4" /> {t('common.send', 'Send')}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {checkins.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <ClipboardCheck className="w-8 h-8" />
          <p>{t('coaching.noCheckins')}</p>
        </div>
      ) : null}

      {checkins.map((ci) => {
        const isExpanded = expandedId === ci.id
        return (
          <div key={ci.id} className="border border-border rounded-lg overflow-hidden">
            {/* Header row — always visible */}
            <button
              onClick={() => onToggle(ci.id)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm text-muted-foreground w-28 flex-shrink-0">
                {new Date(ci.created_at).toLocaleDateString()}
              </span>
              <span className="text-sm font-medium text-foreground w-20">
                {ci.weight ? `${ci.weight} kg` : '—'}
              </span>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {ci.mood != null && (
                  <span className="text-xs text-muted-foreground">
                    <Brain className="w-3 h-3 inline mr-1" />{ci.mood}/10
                  </span>
                )}
                {ci.energy != null && (
                  <span className="text-xs text-muted-foreground">
                    <Zap className="w-3 h-3 inline mr-1" />{ci.energy}/10
                  </span>
                )}
                {ci.sleep_hours != null && (
                  <span className="text-xs text-muted-foreground">
                    <Moon className="w-3 h-3 inline mr-1" />{ci.sleep_hours}h
                  </span>
                )}
              </div>
              {ci.weekly_win && <Trophy className="w-4 h-4 text-green-500 flex-shrink-0" />}
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0 border-t border-border">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                  <DetailField label={t('coaching.metrics.weight')} value={ci.weight ? `${ci.weight} kg` : null} />
                  <DetailField label={t('coaching.metrics.mood')} value={ci.mood != null ? `${ci.mood}/10` : null} />
                  <DetailField label={t('coaching.metrics.energy')} value={ci.energy != null ? `${ci.energy}/10` : null} />
                  <DetailField label={t('coaching.metrics.sleep')} value={ci.sleep_hours != null ? `${ci.sleep_hours}h (${ci.sleep_quality}/10)` : null} />
                  <DetailField label={t('coaching.metrics.hunger')} value={ci.hunger} />
                  <DetailField label={t('coaching.metrics.cravings')} value={ci.cravings} />
                  <DetailField label={t('coaching.metrics.digestion')} value={ci.digestion} />
                  <DetailField label={t('coaching.metrics.activity')} value={ci.activity} />
                  <DetailField label={t('coaching.metrics.fasting')} value={ci.fasting_hours != null ? `${ci.fasting_hours}h` : null} />
                  <DetailField label={t('coaching.metrics.fastingFeeling')} value={ci.fasting_feeling} />
                  <DetailField label={t('coaching.metrics.stress')} value={ci.stress_factors} />
                </div>
                {ci.weekly_win && (
                  <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-xs font-medium text-green-700 mb-1">{t('coaching.metrics.weeklyWin')}</p>
                    <p className="text-sm text-green-600">{ci.weekly_win}</p>
                  </div>
                )}
                {ci.deviations && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs font-medium text-amber-700 mb-1">{t('coaching.metrics.deviations')}</p>
                    <p className="text-sm text-amber-600">{ci.deviations}</p>
                  </div>
                )}
                {ci.notes && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('coaching.metrics.notes')}</p>
                    <p className="text-sm text-foreground">{ci.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function InfoField({ label, value, capitalize }: { label: string; value: string | null; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-medium text-foreground ${capitalize ? 'capitalize' : ''}`}>
        {value || '—'}
      </p>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function NotesTab({
  notes,
  userId,
  adminId,
  onUpdate,
}: {
  notes: CrmNote[]
  userId: string
  adminId?: string
  onUpdate: () => Promise<void>
}) {
  const { t } = useTranslation()
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState<NoteCategory>('coaching')
  const [saving, setSaving] = useState(false)

  async function handleCreate() {
    if (!adminId || !newContent.trim()) return
    setSaving(true)
    try {
      await createNote({
        lead_id: userId,
        created_by: adminId,
        content: newContent.trim(),
        category: newCategory,
      })
      setNewContent('')
      await onUpdate()
    } catch (err) {
      console.error('Create note error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await deleteNote(noteId)
      await onUpdate()
    } catch (err) {
      console.error('Delete note error:', err)
    }
  }

  async function handlePin(noteId: string, pinned: boolean) {
    try {
      await togglePinNote(noteId, pinned)
      await onUpdate()
    } catch (err) {
      console.error('Pin note error:', err)
    }
  }

  return (
    <div className="space-y-4">
      {/* Quick add note */}
      <div className="flex gap-3">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={t('notes.contentPlaceholder')}
            className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as NoteCategory)}
            className="px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
          >
            {NOTE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{t(`notes.categories.${cat}`)}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={saving || !newContent.trim()}
          className="px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <StickyNote className="w-8 h-8" />
          <p>{t('notes.noNotes')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded-xl border bg-card ${
                note.is_pinned ? 'border-primary/30 bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-start gap-3">
                <StickyNote className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {note.title && (
                    <p className="text-sm font-medium text-foreground mb-1">{note.title}</p>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${CATEGORY_COLORS[note.category]}`}>
                      {t(`notes.categories.${note.category}`)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handlePin(note.id, !note.is_pinned)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    {note.is_pinned
                      ? <PinOff className="w-3.5 h-3.5 text-primary" />
                      : <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Utility functions ───

function getWeightChange(checkins: WeeklyCheckin[]): string {
  const withWeight = checkins.filter((c) => c.weight != null)
  if (withWeight.length < 2) return '—'
  const latest = withWeight[0].weight!
  const first = withWeight[withWeight.length - 1].weight!
  const diff = latest - first
  return `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg`
}

function getWeightChangeColor(checkins: WeeklyCheckin[]): string {
  const withWeight = checkins.filter((c) => c.weight != null)
  if (withWeight.length < 2) return 'text-foreground'
  const diff = withWeight[0].weight! - withWeight[withWeight.length - 1].weight!
  if (diff < 0) return 'text-green-600'
  if (diff > 0) return 'text-red-500'
  return 'text-foreground'
}
