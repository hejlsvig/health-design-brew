import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Utensils, Download, Flame, Activity, Scale, Mail, Clock, Heart, X, Shield, Bell, MessageSquare, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container py-12 max-w-4xl">
        <h1 className="font-serif text-3xl font-bold text-primary mb-8">
          {t('profile.title')}
        </h1>
        <div className="rounded-md border border-border bg-card p-6 space-y-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <User className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground">{user?.email}</p>
          <p className="text-sm text-muted-foreground">{t('profile.noProfile')}</p>
          <Link
            to="/calculator"
            className="inline-flex h-10 items-center px-6 rounded-md bg-accent text-accent-foreground font-bold text-sm hover:bg-accent/90 transition-colors"
          >
            {t('nav.calculator')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-12 max-w-4xl">
      <h1 className="font-serif text-3xl font-bold text-primary mb-8">
        {t('profile.title')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Personal Info Card */}
        <div className="md:col-span-2 rounded-md border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg">{t('profile.personalInfo')}</h2>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {profile.name && (
              <div>
                <span className="text-muted-foreground">{t('profile.name')}:</span>
                <p className="font-medium">{profile.name}</p>
              </div>
            )}
            {profile.gender && (
              <div>
                <span className="text-muted-foreground">{t('profile.gender')}:</span>
                <p className="font-medium">{t(`profile.${profile.gender}`)}</p>
              </div>
            )}
            {profile.age && (
              <div>
                <span className="text-muted-foreground">{t('profile.age')}:</span>
                <p className="font-medium">{profile.age} {t('profile.years')}</p>
              </div>
            )}
            {profile.weight && (
              <div>
                <span className="text-muted-foreground">{t('profile.weight')}:</span>
                <p className="font-medium">{Math.round(profile.weight)} kg</p>
              </div>
            )}
            {profile.height && (
              <div>
                <span className="text-muted-foreground">{t('profile.height')}:</span>
                <p className="font-medium">{Math.round(profile.height)} cm</p>
              </div>
            )}
            {profile.activity_level && (
              <div>
                <span className="text-muted-foreground">{t('profile.activityLevel')}:</span>
                <p className="font-medium">{t(`profile.activity.${profile.activity_level}`)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Calorie & Macro Stats */}
        <div className="space-y-4">
          {profile.daily_calories && (
            <div className="rounded-md border border-border bg-accent/10 p-4 flex items-center gap-3">
              <Flame className="h-5 w-5 text-accent" />
              <div>
                <p className="text-2xl font-bold text-accent">{profile.daily_calories}</p>
                <p className="text-xs text-muted-foreground">{t('profile.dailyGoal')} (kcal)</p>
              </div>
            </div>
          )}
          {profile.tdee && (
            <div className="rounded-md border border-border bg-card p-4 flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{profile.tdee}</p>
                <p className="text-xs text-muted-foreground">TDEE (kcal)</p>
              </div>
            </div>
          )}
          {profile.bmr && (
            <div className="rounded-md border border-border bg-card p-4 flex items-center gap-3">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{profile.bmr}</p>
                <p className="text-xs text-muted-foreground">BMR (kcal)</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diet Preferences */}
      {(profile.meals_per_day || profile.weight_goal !== null) && (
        <div className="mt-6 rounded-md border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Utensils className="h-5 w-5 text-accent" />
            </div>
            <h2 className="font-serif font-bold text-lg">{t('profile.dietPreferences')}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {profile.weight_goal !== undefined && profile.weight_goal !== null && (
              <div>
                <span className="text-muted-foreground">{t('profile.weightGoal')}:</span>
                <p className="font-medium">
                  {profile.weight_goal === 0
                    ? t('profile.maintain')
                    : profile.weight_goal < 0
                    ? `${profile.weight_goal} kg/${t('calculator.perMonth')}`
                    : `+${profile.weight_goal} kg/${t('calculator.perMonth')}`}
                </p>
              </div>
            )}
            {profile.meals_per_day && (
              <div>
                <span className="text-muted-foreground">{t('profile.mealsPerDay')}:</span>
                <p className="font-medium">{profile.meals_per_day}</p>
              </div>
            )}
            {profile.prep_time && (
              <div>
                <span className="text-muted-foreground">{t('profile.prepTime')}:</span>
                <p className="font-medium">{t(`profile.prep.${profile.prep_time}`)}</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Consent & Communication Settings */}
      <ConsentManagement user={user} profile={profile} t={t} />

      {/* Saved Recipes */}
      <SavedRecipes user={user} t={t} lang={i18n.language || 'da'} />

      {/* GDPR Actions */}
      <GdprActions user={user} t={t} />
    </div>
  )
}

/* ─── Saved Recipes Component ─── */
interface SavedRecipe {
  id: string
  slug: string
  title: Record<string, string>
  image_url: string | null
  calories: number | null
  total_time: number | null
}

function SavedRecipes({ user, t, lang }: { user: any; t: (k: string) => string; lang: string }) {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([])
  const [loading, setLoading] = useState(true)

  const loc = (field: Record<string, string> | null | undefined, fb = '') => {
    if (!field) return fb
    return field[lang] || field['da'] || field['en'] || fb
  }

  useEffect(() => {
    if (!user) return
    const fetchFavorites = async () => {
      // Get favorite recipe IDs
      const { data: favs } = await supabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', user.id)

      if (!favs || favs.length === 0) {
        setRecipes([])
        setLoading(false)
        return
      }

      // Fetch the actual recipes
      const recipeIds = favs.map(f => f.recipe_id)
      const { data: recipeData } = await supabase
        .from('recipes')
        .select('id, slug, title, image_url, calories, total_time')
        .in('id', recipeIds)

      if (recipeData) setRecipes(recipeData)
      setLoading(false)
    }
    fetchFavorites()
  }, [user])

  const removeFavorite = async (recipeId: string) => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
    await supabase.from('user_favorites').delete().eq('user_id', user.id).eq('recipe_id', recipeId)
  }

  return (
    <div className="mt-6 rounded-md border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="h-5 w-5 text-red-500" />
        <h2 className="font-serif font-bold text-lg">{t('profile.savedRecipes')}</h2>
        {recipes.length > 0 && (
          <span className="ml-auto text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
            {recipes.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : recipes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('profile.noSavedRecipes')}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recipes.map(recipe => (
            <div key={recipe.id} className="group relative flex items-center gap-3 rounded-md border bg-background p-3 hover:shadow-sm transition-shadow">
              {/* Remove button */}
              <button
                onClick={() => removeFavorite(recipe.id)}
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                title={t('recipes.removeFavorite')}
              >
                <X className="h-3 w-3" />
              </button>

              {/* Thumbnail */}
              <Link to={`/recipes?recipe=${recipe.slug}`} className="shrink-0">
                {recipe.image_url ? (
                  <img
                    src={recipe.image_url}
                    alt={loc(recipe.title)}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-md bg-charcoal flex items-center justify-center">
                    <Utensils className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </Link>

              {/* Info */}
              <Link to={`/recipes?recipe=${recipe.slug}`} className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                  {loc(recipe.title)}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  {recipe.total_time != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {recipe.total_time} {t('common.minutes')}
                    </span>
                  )}
                  {recipe.calories != null && (
                    <span className="flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      {recipe.calories} {t('common.calories')}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Consent Management Component ─── */
function ConsentManagement({ user, profile, t }: { user: any; profile: any; t: (k: string) => string }) {
  const [newsletter, setNewsletter] = useState(profile?.newsletter_consent ?? false)
  const [marketing, setMarketing] = useState(profile?.marketing_consent ?? false)
  const [coaching, setCoaching] = useState(profile?.coaching_contact_consent ?? false)
  const [saving, setSaving] = useState<string | null>(null)

  // Keep in sync with profile prop
  useEffect(() => {
    setNewsletter(profile?.newsletter_consent ?? false)
    setMarketing(profile?.marketing_consent ?? false)
    setCoaching(profile?.coaching_contact_consent ?? false)
  }, [profile])

  const toggleConsent = useCallback(async (field: string, consentType: string, newValue: boolean) => {
    if (!user) return
    setSaving(field)

    try {
      // Update profile
      await supabase
        .from('profiles')
        .update({ [field]: newValue })
        .eq('id', user.id)

      // Log to consent_log
      await supabase.from('consent_log').insert({
        user_id: user.id,
        consent_type: consentType,
        granted: newValue,
        source: 'profile_settings',
      })

      // Update local state
      if (field === 'newsletter_consent') setNewsletter(newValue)
      if (field === 'marketing_consent') setMarketing(newValue)
      if (field === 'coaching_contact_consent') setCoaching(newValue)
    } catch (err) {
      console.error('Consent toggle error:', err)
    } finally {
      setSaving(null)
    }
  }, [user])

  const consentItems = [
    {
      field: 'newsletter_consent',
      consentType: 'newsletter',
      value: newsletter,
      icon: <Mail className="h-4 w-4" />,
      label: t('consent.newsletter'),
      desc: t('consent.newsletterDesc'),
    },
    {
      field: 'marketing_consent',
      consentType: 'marketing_email',
      value: marketing,
      icon: <Bell className="h-4 w-4" />,
      label: t('consent.marketing'),
      desc: t('consent.marketingDesc'),
    },
    {
      field: 'coaching_contact_consent',
      consentType: 'coaching_contact',
      value: coaching,
      icon: <MessageSquare className="h-4 w-4" />,
      label: t('consent.coaching'),
      desc: t('consent.coachingDesc'),
    },
  ]

  return (
    <div className="mt-6 rounded-md border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-serif font-bold text-lg">{t('consent.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('consent.subtitle')}</p>
        </div>
      </div>

      <div className="divide-y divide-border">
        {consentItems.map(item => (
          <div key={item.field} className="flex items-center justify-between py-3 gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <span className="mt-0.5 text-muted-foreground">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
            <button
              disabled={saving === item.field}
              onClick={() => toggleConsent(item.field, item.consentType, !item.value)}
              className={`relative shrink-0 h-6 w-11 rounded-full transition-colors ${
                item.value ? 'bg-accent' : 'bg-muted'
              } ${saving === item.field ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                  item.value ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── GDPR Actions Component ─── */
function GdprActions({ user, t }: { user: any; t: (k: string) => string }) {
  const [exporting, setExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleExport = async () => {
    if (!user) return
    setExporting(true)

    try {
      // Fetch all user data
      const [profileRes, consentRes, activityRes, checkinsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('consent_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('lead_activity').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('weekly_checkins').select('*').eq('coaching_client_id',
          (await supabase.from('coaching_clients').select('id').eq('profile_id', user.id)).data?.[0]?.id
        ),
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        consent_log: consentRes.data || [],
        activity_log: activityRes.data || [],
        checkins: checkinsRes.data || [],
      }

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shifting-source-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Log the data export activity
      await supabase.from('lead_activity').insert({
        user_id: user.id,
        activity_type: 'data_exported',
        activity_details: { format: 'json' },
      }).then(() => {}, () => {}) // Don't fail if lead_activity table isn't ready yet
    } catch (err) {
      console.error('Data export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    // Log the deletion intent, then delete profile data
    // (auth.users deletion requires server-side admin API — we mark profile as deleted)
    try {
      await supabase.from('lead_activity').insert({
        user_id: user.id,
        activity_type: 'account_deleted',
      }).then(() => {}, () => {})

      // Anonymize profile
      await supabase.from('profiles').update({
        name: 'Deleted User',
        email: `deleted-${user.id}@anonymized.local`,
        gender: null,
        age: null,
        weight: null,
        height: null,
        newsletter_consent: false,
        marketing_consent: false,
        coaching_contact_consent: false,
      }).eq('id', user.id)

      // Sign out
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (err) {
      console.error('Account deletion error:', err)
    }
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <button
        onClick={handleExport}
        disabled={exporting}
        className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {t('profile.exportData')}
      </button>

      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="h-9 px-4 rounded-md border border-destructive/30 text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {t('profile.deleteAccount')}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive">{t('profile.deleteConfirm')}</span>
          <button
            onClick={handleDeleteAccount}
            className="h-9 px-4 rounded-md bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            {t('consent.confirmDelete')}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="h-9 px-4 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('admin.cancel')}
          </button>
        </div>
      )}
    </div>
  )
}
