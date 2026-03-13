import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, User, Flame, Activity, Scale, Shield,
  MessageSquare, Dumbbell, Calendar, Clock, FileText,
  ChevronDown, ChevronUp, Loader2, Send, CheckCircle2
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  fetchLeadDetail, updateLeadStatus, addLeadNote, activateCoaching,
  statusLabel, statusColor, activityLabel,
  type LeadStatusValue
} from '@/lib/crm'

export default function AdminCRMDetail() {
  const { t } = useTranslation()
  const { userId } = useParams<{ userId: string }>()
  const { user: authUser, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showTimeline, setShowTimeline] = useState(true)
  const [showConsent, setShowConsent] = useState(true)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [showCoachingModal, setShowCoachingModal] = useState(false)
  const [coachingFreq, setCoachingFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [activatingCoaching, setActivatingCoaching] = useState(false)

  useEffect(() => {
    if (!authLoading && (!authUser || !isAdmin)) navigate('/login')
  }, [authUser, isAdmin, authLoading, navigate])

  useEffect(() => {
    if (isAdmin && userId) loadDetail()
  }, [isAdmin, userId])

  const loadDetail = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const result = await fetchLeadDetail(userId)
      setData(result)
    } catch (err) {
      console.error('Lead detail error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: LeadStatusValue) => {
    if (!userId) return
    setChangingStatus(true)
    try {
      await updateLeadStatus(userId, newStatus, authUser?.id)
      await loadDetail()
    } catch (err) {
      console.error('Status change error:', err)
    } finally {
      setChangingStatus(false)
    }
  }

  const handleAddNote = async () => {
    if (!userId || !noteText.trim()) return
    setAddingNote(true)
    try {
      await addLeadNote(userId, noteText.trim(), authUser?.id)
      setNoteText('')
      await loadDetail()
    } catch (err) {
      console.error('Add note error:', err)
    } finally {
      setAddingNote(false)
    }
  }

  const handleActivateCoaching = async () => {
    if (!userId) return
    setActivatingCoaching(true)
    try {
      await activateCoaching(userId, {
        adminId: authUser?.id,
        checkInFrequency: coachingFreq,
      })
      setShowCoachingModal(false)
      await loadDetail()
    } catch (err) {
      console.error('Coaching activation error:', err)
    } finally {
      setActivatingCoaching(false)
    }
  }

  if (!isAdmin) return null

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (!data?.profile && !data?.subscriber) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground mb-4">Lead ikke fundet.</p>
        <Link to="/admin/crm" className="text-accent hover:underline">← Tilbage til CRM</Link>
      </div>
    )
  }

  const { lead, profile, consentLog, activityLog, coaching, subscriber, isSubscriber } = data

  // For subscriber leads, use subscriber data
  const displayName = isSubscriber ? (subscriber?.name || 'Ingen navn') : (profile?.name || 'Ingen navn')
  const displayEmail = isSubscriber ? subscriber?.email : profile?.email
  const allStatuses: LeadStatusValue[] = [
    'new', 'contacted', 'qualified', 'coaching_active',
    'coaching_paused', 'coaching_completed', 'inactive', 'opted_out'
  ]

  return (
    <div className="container py-8 max-w-5xl">
      {/* Back link */}
      <Link
        to="/admin/crm"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Tilbage til CRM
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left column: Profile + Stats ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile card */}
          <div className="rounded-md border border-border bg-card p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-serif text-xl font-bold">
                    {displayName}
                    {isSubscriber && (
                      <span className="ml-2 text-xs font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">GÆST</span>
                    )}
                  </h1>
                  <p className="text-sm text-muted-foreground">{displayEmail}</p>
                </div>
              </div>
              {lead && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(lead.status)}`}>
                  {statusLabel(lead.status)}
                </span>
              )}
              {isSubscriber && !lead && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                  Ny (gæst)
                </span>
              )}
            </div>

            {/* Quick info grid — profile leads */}
            {profile && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {profile.daily_calories && (
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-accent" />
                    <span>{profile.daily_calories} kcal</span>
                  </div>
                )}
                {profile.tdee && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span>TDEE: {profile.tdee}</span>
                  </div>
                )}
                {profile.weight && (
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <span>{Math.round(profile.weight)} kg</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(profile.created_at).toLocaleDateString('da-DK')}</span>
                </div>
              </div>
            )}

            {/* Quick info grid — subscriber leads */}
            {isSubscriber && subscriber && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{new Date(subscriber.created_at).toLocaleDateString('da-DK')}</span>
                </div>
                {subscriber.language && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>Sprog: {subscriber.language.toUpperCase()}</span>
                  </div>
                )}
                {subscriber.source && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span>Kilde: {subscriber.source}</span>
                  </div>
                )}
              </div>
            )}

            {/* Lead info — auth leads */}
            {lead && (
              <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Kilde:</span>{' '}
                  <span className="bg-muted px-2 py-0.5 rounded text-xs">{lead.source}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Score:</span>{' '}
                  <span className="font-bold text-accent">{lead.lead_score}/100</span>
                </div>
                {lead.follow_up_date && (
                  <div>
                    <span className="text-muted-foreground">Follow-up:</span>{' '}
                    <span>{new Date(lead.follow_up_date).toLocaleDateString('da-DK')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Subscriber tags */}
            {isSubscriber && subscriber?.tags?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground mr-2">Tags:</span>
                {subscriber.tags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-muted px-2 py-0.5 rounded-full mr-1.5">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Status change + Actions — only for auth leads */}
          {!isSubscriber && (
          <div className="rounded-md border border-border bg-card p-4 flex flex-wrap gap-3 items-center">
            <span className="text-sm font-medium mr-2">Ændr status:</span>
            <select
              value={lead?.status || ''}
              onChange={e => handleStatusChange(e.target.value as LeadStatusValue)}
              disabled={changingStatus}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            >
              {allStatuses.map(s => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>

            {(!coaching || coaching.status !== 'active') && (
              <button
                onClick={() => setShowCoachingModal(true)}
                className="h-8 px-3 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors flex items-center gap-1"
              >
                <Dumbbell className="h-3.5 w-3.5" />
                Aktivér Coaching
              </button>
            )}

            {coaching?.status === 'active' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Coaching aktiv
              </span>
            )}
          </div>
          )}

          {/* Add note */}
          <div className="rounded-md border border-border bg-card p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Tilføj note
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Skriv en note..."
                onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleAddNote}
                disabled={addingNote || !noteText.trim()}
                className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {addingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="rounded-md border border-border bg-card">
            <button
              onClick={() => setShowTimeline(v => !v)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h3 className="font-serif font-bold flex items-center gap-2">
                <Clock className="h-4 w-4" /> Aktivitetstidslinje
                <span className="text-xs text-muted-foreground font-normal">({activityLog.length})</span>
              </h3>
              {showTimeline ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showTimeline && (
              <div className="px-4 pb-4 space-y-3">
                {activityLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ingen aktivitet endnu.</p>
                ) : (
                  activityLog.map((a: any) => (
                    <div key={a.id} className="flex gap-3 text-sm">
                      <div className="w-2 h-2 mt-1.5 rounded-full bg-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium">{activityLabel(a.activity_type)}</p>
                        {a.notes && <p className="text-muted-foreground text-xs mt-0.5">{a.notes}</p>}
                        {a.activity_details && Object.keys(a.activity_details).length > 0 && (
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {JSON.stringify(a.activity_details)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {new Date(a.created_at).toLocaleString('da-DK')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right column: Consent + Coaching ─── */}
        <div className="space-y-6">
          {/* Consent status */}
          <div className="rounded-md border border-border bg-card">
            <button
              onClick={() => setShowConsent(v => !v)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h3 className="font-serif font-bold flex items-center gap-2">
                <Shield className="h-4 w-4" /> Samtykke
              </h3>
              {showConsent ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showConsent && (
              <div className="px-4 pb-4 space-y-2">
                {profile && (
                  <>
                    <ConsentBadge label="Nyhedsbrev" granted={profile.newsletter_consent} />
                    <ConsentBadge label="Marketing" granted={profile.marketing_consent} />
                    <ConsentBadge label="Coaching kontakt" granted={profile.coaching_contact_consent} />
                    <ConsentBadge label="GDPR" granted={profile.gdpr_consent} />
                  </>
                )}
                {isSubscriber && subscriber && (
                  <>
                    <ConsentBadge label="Nyhedsbrev" granted={subscriber.tags?.includes('newsletter')} />
                    <ConsentBadge label="Kontakt OK" granted={subscriber.tags?.includes('contact_ok')} />
                    <ConsentBadge label="Kostplan" granted={subscriber.tags?.includes('meal_plan')} />
                    <ConsentBadge label="Aktiv" granted={subscriber.is_active} />
                  </>
                )}

                {consentLog.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2">Seneste ændringer:</p>
                    {consentLog.slice(0, 5).map((c: any) => (
                      <div key={c.id} className="text-xs text-muted-foreground flex gap-2 mb-1">
                        <span className={c.granted ? 'text-green-600' : 'text-red-500'}>
                          {c.granted ? '✓' : '✗'}
                        </span>
                        <span>{c.consent_type}</span>
                        <span className="ml-auto">{new Date(c.created_at).toLocaleDateString('da-DK')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Coaching info */}
          {coaching && (
            <div className="rounded-md border border-border bg-card p-4 space-y-2">
              <h3 className="font-serif font-bold flex items-center gap-2">
                <Dumbbell className="h-4 w-4" /> Coaching
              </h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={coaching.status === 'active' ? 'text-green-600 font-medium' : ''}>{coaching.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start:</span>
                  <span>{coaching.start_date ? new Date(coaching.start_date).toLocaleDateString('da-DK') : '–'}</span>
                </div>
                {coaching.check_in_frequency && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in:</span>
                    <span>{coaching.check_in_frequency}</span>
                  </div>
                )}
                {coaching.payment_status && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Betaling:</span>
                    <span>{coaching.payment_status}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile details */}
          {profile && (
          <div className="rounded-md border border-border bg-card p-4 space-y-2">
            <h3 className="font-serif font-bold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Profil detaljer
            </h3>
            <div className="text-sm space-y-1">
              {profile.language && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sprog:</span>
                  <span>{profile.language.toUpperCase()}</span>
                </div>
              )}
              {profile.gender && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Køn:</span>
                  <span>{profile.gender === 'male' ? 'Mand' : 'Kvinde'}</span>
                </div>
              )}
              {profile.age && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alder:</span>
                  <span>{profile.age} år</span>
                </div>
              )}
              {profile.height && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Højde:</span>
                  <span>{Math.round(profile.height)} cm</span>
                </div>
              )}
              {profile.meals_per_day && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Måltider/dag:</span>
                  <span>{profile.meals_per_day}</span>
                </div>
              )}
              {profile.profile_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profiltype:</span>
                  <span>{profile.profile_type}</span>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Subscriber details (for guest leads) */}
          {isSubscriber && subscriber && (
          <div className="rounded-md border border-border bg-card p-4 space-y-2">
            <h3 className="font-serif font-bold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Subscriber detaljer
            </h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sprog:</span>
                <span>{(subscriber.language || 'da').toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kilde:</span>
                <span>{subscriber.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Oprettet:</span>
                <span>{new Date(subscriber.created_at).toLocaleDateString('da-DK')}</span>
              </div>
              {subscriber.updated_at && subscriber.updated_at !== subscriber.created_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Opdateret:</span>
                  <span>{new Date(subscriber.updated_at).toLocaleDateString('da-DK')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span>Gæst (ikke logget ind)</span>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Coaching activation modal */}
      {showCoachingModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCoachingModal(false)}>
          <div className="bg-card rounded-lg border border-border p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-serif font-bold text-lg">Aktivér Coaching</h3>
            <p className="text-sm text-muted-foreground">
              Aktivér coaching for <strong>{profile.name || profile.email}</strong>
            </p>

            <div>
              <label className="text-sm font-medium">Check-in frekvens:</label>
              <select
                value={coachingFreq}
                onChange={e => setCoachingFreq(e.target.value as 'weekly' | 'biweekly' | 'monthly')}
                className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="weekly">Ugentlig</option>
                <option value="biweekly">Hver anden uge</option>
                <option value="monthly">Månedlig</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCoachingModal(false)}
                className="h-9 px-4 rounded-md border border-border text-sm hover:bg-muted transition-colors"
              >
                Annuller
              </button>
              <button
                onClick={handleActivateCoaching}
                disabled={activatingCoaching}
                className="h-9 px-4 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {activatingCoaching && <Loader2 className="h-4 w-4 animate-spin" />}
                Aktivér
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Consent Badge ─── */
function ConsentBadge({ label, granted }: { label: string; granted: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${
        granted ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
      }`}>
        {granted ? 'Ja' : 'Nej'}
      </span>
    </div>
  )
}
