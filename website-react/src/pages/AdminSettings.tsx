import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Settings, Key, Cpu, Save, Loader2, Check, ArrowLeft, Eye, EyeOff, Image, Server, MessageSquare, RotateCcw, Share2, Instagram, Youtube, Facebook, FileText, ImageIcon, ExternalLink, Sparkles, Shield, Globe, Search, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Mail, Bell, UtensilsCrossed, Video } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getSettings, saveSetting, AVAILABLE_MODELS, DEFAULT_ARTICLE_PROMPT } from '@/lib/openai'
import { supabase } from '@/lib/supabase'
import { DEFAULT_PROMPTS } from '@/lib/chatai'
import { DEFAULT_IMAGE_PROMPT_RECIPE, DEFAULT_IMAGE_PROMPT_ARTICLE, DEFAULT_VIDEO_PROMPT_ARTICLE, DEFAULT_VIDEO_PROMPT_RECIPE } from '@/lib/kieai'
import { cn } from '@/lib/utils'

/** Reusable save button for individual sections */
function SectionSaveButton({ onSave, label = 'Gem' }: { onSave: () => Promise<void>; label?: string }) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleClick = async () => {
    setError('')
    setSaving(true)
    setSaved(false)
    try {
      await onSave()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || 'Kunne ikke gemme')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 pt-3 border-t border-border/30 mt-4">
      <button
        onClick={handleClick}
        disabled={saving}
        className="inline-flex h-9 items-center gap-2 px-5 rounded-md bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Gemmer...</>
        ) : saved ? (
          <><Check className="h-4 w-4" />Gemt!</>
        ) : (
          <><Save className="h-4 w-4" />{label}</>
        )}
      </button>
      {saved && <span className="text-sm text-green-600 font-medium">Gemt</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  )
}

type SettingsTab = 'ai' | 'social' | 'seo' | 'hosting'

const TABS: { id: SettingsTab; label: string; icon: typeof Cpu }[] = [
  { id: 'ai', label: 'AI & Generering', icon: Sparkles },
  { id: 'social', label: 'Sociale Medier', icon: Share2 },
  { id: 'seo', label: 'SEO & Sikkerhed', icon: Shield },
  { id: 'hosting', label: 'Hosting & Email', icon: Server },
]

export default function AdminSettings() {
  const { t } = useTranslation()
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai')

  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-5.2')
  const [showKey, setShowKey] = useState(false)
  const [hasExistingKey, setHasExistingKey] = useState(false)

  // Mealplan AI (separate from article generation)
  const [mealplanApiKey, setMealplanApiKey] = useState('')
  const [mealplanModel, setMealplanModel] = useState('')
  const [mealplanFromEmail, setMealplanFromEmail] = useState('')
  const [mealplanFromName, setMealplanFromName] = useState('')
  const [mealplanSmtpHost, setMealplanSmtpHost] = useState('')
  const [mealplanSmtpPort, setMealplanSmtpPort] = useState('465')
  const [mealplanSmtpUser, setMealplanSmtpUser] = useState('')
  const [mealplanSmtpPassword, setMealplanSmtpPassword] = useState('')
  const [showMealplanSmtpPassword, setShowMealplanSmtpPassword] = useState(false)
  const [hasExistingMealplanSmtpPassword, setHasExistingMealplanSmtpPassword] = useState(false)
  const [showMealplanKey, setShowMealplanKey] = useState(false)
  const [hasExistingMealplanKey, setHasExistingMealplanKey] = useState(false)

  // Kie.ai
  const [kieaiKey, setKieaiKey] = useState('')
  const [showKieaiKey, setShowKieaiKey] = useState(false)
  const [hasExistingKieaiKey, setHasExistingKieaiKey] = useState(false)

  // SFTP
  const [sftpHost, setSftpHost] = useState('')
  const [sftpPort, setSftpPort] = useState('22')
  const [sftpUsername, setSftpUsername] = useState('')
  const [sftpPassword, setSftpPassword] = useState('')
  const [showSftpPassword, setShowSftpPassword] = useState(false)
  const [hasExistingSftpPassword, setHasExistingSftpPassword] = useState(false)

  // SMTP Email
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('465')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  const [hasExistingSmtpPassword, setHasExistingSmtpPassword] = useState(false)
  const [smtpFromEmail, setSmtpFromEmail] = useState('')
  const [smtpFromName, setSmtpFromName] = useState('Shifting Source')

  // AI Prompts
  const [chatPromptDa, setChatPromptDa] = useState('')
  const [chatPromptEn, setChatPromptEn] = useState('')
  const [chatPromptSe, setChatPromptSe] = useState('')
  const [promptTab, setPromptTab] = useState<'da' | 'en' | 'se'>('da')
  const [promptSection, setPromptSection] = useState<'chat' | 'article' | 'image' | 'video' | 'mealplan'>('chat')
  const [articlePrompt, setArticlePrompt] = useState('')
  const [mealPlanPrompt, setMealPlanPrompt] = useState('')
  const [imagePromptRecipe, setImagePromptRecipe] = useState('')
  const [imagePromptArticle, setImagePromptArticle] = useState('')
  const [videoPromptArticle, setVideoPromptArticle] = useState('')
  const [videoPromptRecipe, setVideoPromptRecipe] = useState('')

  // Social media
  const [socialInstagram, setSocialInstagram] = useState('')
  const [socialYoutube, setSocialYoutube] = useState('')
  const [socialTiktok, setSocialTiktok] = useState('')
  const [socialFacebook, setSocialFacebook] = useState('')

  // SEO & Security
  const [siteUrl, setSiteUrl] = useState('https://shiftingsource.com')
  const [siteName, setSiteName] = useState('Shifting Source')
  const [seoDefaultDescription, setSeoDefaultDescription] = useState('')
  const [seoGoogleVerification, setSeoGoogleVerification] = useState('')
  const [gaMeasurementId, setGaMeasurementId] = useState('')
  const [seoRobotsDisallow, setSeoRobotsDisallow] = useState('/admin/\n/crm/\n/login\n/profile')
  const [securityFrameOptions, setSecurityFrameOptions] = useState('SAMEORIGIN')
  const [securityReferrerPolicy, setSecurityReferrerPolicy] = useState('strict-origin-when-cross-origin')
  const [adminNotificationEmail, setAdminNotificationEmail] = useState('')

  // Rate limiting & CSP (dynamisk config)
  const [rateLimitMax, setRateLimitMax] = useState('5')
  const [rateLimitWindow, setRateLimitWindow] = useState('60')
  const [cspExtraDomains, setCspExtraDomains] = useState('')

  // Health check state
  interface HealthCheck {
    name: string
    status: 'pass' | 'warn' | 'fail'
    detail: string
    checked_at: string
  }
  interface HealthCheckResult {
    overall_status: 'ok' | 'warning' | 'error'
    checks: HealthCheck[]
    failures: number
    warnings: number
    total_checks: number
    run_at: string
    notification_sent?: boolean
  }
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthCheckEnabled, setHealthCheckEnabled] = useState(true)

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login')
    }
  }, [user, isAdmin, authLoading, navigate])

  // Load settings
  useEffect(() => {
    if (isAdmin) loadSettings()
  }, [isAdmin])

  const loadSettings = async () => {
    try {
      const s = await getSettings()
      if (s.openai_api_key) {
        setApiKey('sk-••••••••' + s.openai_api_key.slice(-4))
        setHasExistingKey(true)
      }
      setModel(s.ai_model || 'gpt-5.2-chat-latest')

      // Mealplan AI
      if (s.mealplan_openai_api_key) {
        setMealplanApiKey('sk-••••••••' + s.mealplan_openai_api_key.slice(-4))
        setHasExistingMealplanKey(true)
      }
      if (s.mealplan_ai_model) setMealplanModel(s.mealplan_ai_model)
      if (s.mealplan_smtp_from_email) setMealplanFromEmail(s.mealplan_smtp_from_email)
      if (s.mealplan_smtp_from_name) setMealplanFromName(s.mealplan_smtp_from_name)
      if (s.mealplan_smtp_host) setMealplanSmtpHost(s.mealplan_smtp_host)
      if (s.mealplan_smtp_port) setMealplanSmtpPort(s.mealplan_smtp_port)
      if (s.mealplan_smtp_user) setMealplanSmtpUser(s.mealplan_smtp_user)
      if (s.mealplan_smtp_password) {
        setMealplanSmtpPassword('••••••••')
        setHasExistingMealplanSmtpPassword(true)
      }

      if (s.kieai_api_key) {
        setKieaiKey('••••••••' + s.kieai_api_key.slice(-4))
        setHasExistingKieaiKey(true)
      }
      if (s.sftp_host) setSftpHost(s.sftp_host)
      if (s.sftp_port) setSftpPort(s.sftp_port)
      if (s.sftp_username) setSftpUsername(s.sftp_username)
      if (s.sftp_password) {
        setSftpPassword('••••••••' + s.sftp_password.slice(-4))
        setHasExistingSftpPassword(true)
      }

      // SMTP Email
      if (s.smtp_host) setSmtpHost(s.smtp_host)
      if (s.smtp_port) setSmtpPort(s.smtp_port)
      if (s.smtp_user) setSmtpUser(s.smtp_user)
      if (s.smtp_password) {
        setSmtpPassword('••••••••' + s.smtp_password.slice(-4))
        setHasExistingSmtpPassword(true)
      }
      if (s.smtp_from_email) setSmtpFromEmail(s.smtp_from_email)
      if (s.smtp_from_name) setSmtpFromName(s.smtp_from_name)

      // AI Prompts — pre-populate with defaults if not set in database
      setChatPromptDa(s.chat_system_prompt_da || DEFAULT_PROMPTS['da'] || '')
      setChatPromptEn(s.chat_system_prompt_en || DEFAULT_PROMPTS['en'] || '')
      setChatPromptSe(s.chat_system_prompt_se || DEFAULT_PROMPTS['se'] || '')

      // Article & image prompts
      setArticlePrompt(s.article_system_prompt || '')
      setImagePromptRecipe(s.image_prompt_recipe || '')
      setImagePromptArticle(s.image_prompt_article || '')
      setVideoPromptArticle(s.video_prompt_article || '')
      setVideoPromptRecipe(s.video_prompt_recipe || '')
      setMealPlanPrompt(s.mealplan_system_prompt || '')

      // Social media
      setSocialInstagram(s.social_instagram || '')
      setSocialYoutube(s.social_youtube || '')
      setSocialTiktok(s.social_tiktok || '')
      setSocialFacebook(s.social_facebook || '')

      // SEO & Security
      if (s.site_url) setSiteUrl(s.site_url)
      if (s.site_name) setSiteName(s.site_name)
      if (s.seo_default_description) setSeoDefaultDescription(s.seo_default_description)
      if (s.seo_google_verification) setSeoGoogleVerification(s.seo_google_verification)
      if (s.ga_measurement_id) setGaMeasurementId(s.ga_measurement_id)
      if (s.seo_robots_disallow) setSeoRobotsDisallow(s.seo_robots_disallow)
      if (s.security_frame_options) setSecurityFrameOptions(s.security_frame_options)
      if (s.security_referrer_policy) setSecurityReferrerPolicy(s.security_referrer_policy)
      if (s.admin_notification_email) setAdminNotificationEmail(s.admin_notification_email)
      if (s.health_check_enabled !== undefined) setHealthCheckEnabled(s.health_check_enabled !== 'false')

      // Rate limiting & CSP
      if (s.rate_limit_max_requests) setRateLimitMax(s.rate_limit_max_requests)
      if (s.rate_limit_window_seconds) setRateLimitWindow(s.rate_limit_window_seconds)
      if (s.csp_extra_domains) setCspExtraDomains(s.csp_extra_domains)

      // Load latest health check from database
      loadLatestHealthCheck()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadLatestHealthCheck = async () => {
    try {
      const { data } = await supabase
        .from('health_checks')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setHealthCheck({
          overall_status: data.overall_status,
          checks: data.checks as HealthCheck[],
          failures: data.failures,
          warnings: data.warnings,
          total_checks: data.total_checks,
          run_at: data.run_at,
          notification_sent: data.notification_sent,
        })
      }
    } catch {
      // No health checks yet — that's fine
    }
  }

  const runHealthCheck = async () => {
    setHealthLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://hllprmlkuchhfmexzpad.supabase.co'}/functions/v1/health-check`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
        }
      )
      const result = await resp.json()
      if (result.checks) {
        setHealthCheck({
          overall_status: result.overall_status,
          checks: result.checks,
          failures: result.failures,
          warnings: result.warnings,
          total_checks: result.total_checks,
          run_at: new Date().toISOString(),
          notification_sent: result.notification_sent,
        })
      }
    } catch (err: any) {
      setError(`Health check fejl: ${err.message}`)
    } finally {
      setHealthLoading(false)
    }
  }

  // ── Per-section save functions ──

  const saveOpenAI = useCallback(async () => {
    if (apiKey && !apiKey.startsWith('sk-••••')) {
      if (!apiKey.startsWith('sk-')) throw new Error('API key skal starte med "sk-"')
      await saveSetting('openai_api_key', apiKey, user?.id)
    }
    await saveSetting('ai_model', model, user?.id)
  }, [apiKey, model, user?.id])

  const saveKieai = useCallback(async () => {
    if (kieaiKey && !kieaiKey.startsWith('••••')) {
      await saveSetting('kieai_api_key', kieaiKey, user?.id)
    }
  }, [kieaiKey, user?.id])

  const saveMealplanAI = useCallback(async () => {
    if (mealplanApiKey && !mealplanApiKey.startsWith('sk-••••')) {
      if (!mealplanApiKey.startsWith('sk-')) throw new Error('API key skal starte med "sk-"')
      await saveSetting('mealplan_openai_api_key', mealplanApiKey, user?.id)
    }
    if (mealplanModel) {
      await saveSetting('mealplan_ai_model', mealplanModel, user?.id)
    }
    await saveSetting('mealplan_smtp_from_email', mealplanFromEmail, user?.id)
    await saveSetting('mealplan_smtp_from_name', mealplanFromName, user?.id)
    await saveSetting('mealplan_smtp_host', mealplanSmtpHost, user?.id)
    await saveSetting('mealplan_smtp_port', mealplanSmtpPort, user?.id)
    await saveSetting('mealplan_smtp_user', mealplanSmtpUser, user?.id)
    if (mealplanSmtpPassword && !mealplanSmtpPassword.startsWith('••••')) {
      await saveSetting('mealplan_smtp_password', mealplanSmtpPassword, user?.id)
    }
  }, [mealplanApiKey, mealplanModel, mealplanFromEmail, mealplanFromName, mealplanSmtpHost, mealplanSmtpPort, mealplanSmtpUser, mealplanSmtpPassword, user?.id])

  const saveChatPrompts = useCallback(async () => {
    await saveSetting('chat_system_prompt_da', chatPromptDa, user?.id)
    await saveSetting('chat_system_prompt_en', chatPromptEn, user?.id)
    await saveSetting('chat_system_prompt_se', chatPromptSe, user?.id)
  }, [chatPromptDa, chatPromptEn, chatPromptSe, user?.id])

  const saveArticlePrompt = useCallback(async () => {
    await saveSetting('article_system_prompt', articlePrompt, user?.id)
  }, [articlePrompt, user?.id])

  const saveImagePromptRecipe = useCallback(async () => {
    await saveSetting('image_prompt_recipe', imagePromptRecipe, user?.id)
  }, [imagePromptRecipe, user?.id])

  const saveImagePromptArticle = useCallback(async () => {
    await saveSetting('image_prompt_article', imagePromptArticle, user?.id)
  }, [imagePromptArticle, user?.id])

  const saveVideoPromptArticle = useCallback(async () => {
    await saveSetting('video_prompt_article', videoPromptArticle, user?.id)
  }, [videoPromptArticle, user?.id])

  const saveVideoPromptRecipe = useCallback(async () => {
    await saveSetting('video_prompt_recipe', videoPromptRecipe, user?.id)
  }, [videoPromptRecipe, user?.id])

  const saveMealPlanPrompt = useCallback(async () => {
    await saveSetting('mealplan_system_prompt', mealPlanPrompt, user?.id)
  }, [mealPlanPrompt, user?.id])

  const saveSocial = useCallback(async () => {
    await saveSetting('social_instagram', socialInstagram, user?.id)
    await saveSetting('social_youtube', socialYoutube, user?.id)
    await saveSetting('social_tiktok', socialTiktok, user?.id)
    await saveSetting('social_facebook', socialFacebook, user?.id)
  }, [socialInstagram, socialYoutube, socialTiktok, socialFacebook, user?.id])

  const saveSeo = useCallback(async () => {
    await saveSetting('site_url', siteUrl, user?.id)
    await saveSetting('site_name', siteName, user?.id)
    await saveSetting('seo_default_description', seoDefaultDescription, user?.id)
    await saveSetting('seo_google_verification', seoGoogleVerification, user?.id)
    await saveSetting('ga_measurement_id', gaMeasurementId, user?.id)
    await saveSetting('seo_robots_disallow', seoRobotsDisallow, user?.id)
  }, [siteUrl, siteName, seoDefaultDescription, seoGoogleVerification, gaMeasurementId, seoRobotsDisallow, user?.id])

  const saveSecurity = useCallback(async () => {
    await saveSetting('security_frame_options', securityFrameOptions, user?.id)
    await saveSetting('security_referrer_policy', securityReferrerPolicy, user?.id)
    await saveSetting('rate_limit_max_requests', rateLimitMax, user?.id)
    await saveSetting('rate_limit_window_seconds', rateLimitWindow, user?.id)
    await saveSetting('csp_extra_domains', cspExtraDomains, user?.id)
    await saveSetting('admin_notification_email', adminNotificationEmail, user?.id)
    await saveSetting('health_check_enabled', healthCheckEnabled ? 'true' : 'false', user?.id)
  }, [securityFrameOptions, securityReferrerPolicy, rateLimitMax, rateLimitWindow, cspExtraDomains, adminNotificationEmail, healthCheckEnabled, user?.id])

  const saveSftp = useCallback(async () => {
    if (sftpHost) await saveSetting('sftp_host', sftpHost, user?.id)
    if (sftpPort) await saveSetting('sftp_port', sftpPort, user?.id)
    if (sftpUsername) await saveSetting('sftp_username', sftpUsername, user?.id)
    if (sftpPassword && !sftpPassword.startsWith('••••')) {
      await saveSetting('sftp_password', sftpPassword, user?.id)
    }
  }, [sftpHost, sftpPort, sftpUsername, sftpPassword, user?.id])

  const saveSmtp = useCallback(async () => {
    if (smtpHost) await saveSetting('smtp_host', smtpHost, user?.id)
    if (smtpPort) await saveSetting('smtp_port', smtpPort, user?.id)
    if (smtpUser) await saveSetting('smtp_user', smtpUser, user?.id)
    if (smtpPassword && !smtpPassword.startsWith('••••')) {
      await saveSetting('smtp_password', smtpPassword, user?.id)
    }
    await saveSetting('smtp_from_email', smtpFromEmail, user?.id)
    await saveSetting('smtp_from_name', smtpFromName, user?.id)
  }, [smtpHost, smtpPort, smtpUser, smtpPassword, smtpFromEmail, smtpFromName, user?.id])

  if (authLoading || loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        {t('common.loading')}
      </div>
    )
  }

  if (!isAdmin) return null

  return (
    <div className="container py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="font-serif text-2xl font-bold text-primary">
          {t('admin.settingsTitle', 'Admin Settings')}
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-card border border-border rounded-lg p-1 mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sage/10'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* ═══════════════════════════════════════════ */}
        {/* TAB 1: AI & Generering                     */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'ai' && (
          <>
            {/* ── OpenAI API Key & Model ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  {t('admin.aiGeneration', 'OpenAI Tekstgenerering')}
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                {t('admin.aiGenerationDescription', 'OpenAI bruges til at generere artikler, chat-svar og sociale medier captions.')}
              </p>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <Key className="inline h-3.5 w-3.5 mr-1" />
                  {t('admin.fieldApiKey', 'API Key')}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => { setApiKey(e.target.value); setHasExistingKey(false) }}
                    onFocus={() => { if (hasExistingKey) { setApiKey(''); setHasExistingKey(false) } }}
                    placeholder="sk-..."
                    className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t('admin.apiKeyHint', 'Hent din API-nøgle fra')}{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    platform.openai.com/api-keys
                  </a>
                </p>
              </div>

              {/* Model selector */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <Cpu className="inline h-3.5 w-3.5 mr-1" />
                  {t('admin.fieldModel', 'AI Model')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={cn(
                        'rounded-md border px-3 py-2.5 text-left transition-colors',
                        model === m.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block text-[11px] opacity-70">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <SectionSaveButton onSave={saveOpenAI} label="Gem API-indstillinger" />
            </section>

            {/* ── Kie.ai Image Generation ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  {t('admin.imageGeneration', 'AI Billedgenerering (Kie.ai)')}
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                {t('admin.imageGenerationDescription', 'Nanobanana Pro via Kie.ai bruges til at generere billeder til artikler og opskrifter.')}
              </p>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <Key className="inline h-3.5 w-3.5 mr-1" />
                  Kie.ai API Key
                </label>
                <div className="relative">
                  <input
                    type={showKieaiKey ? 'text' : 'password'}
                    value={kieaiKey}
                    onChange={e => { setKieaiKey(e.target.value); setHasExistingKieaiKey(false) }}
                    onFocus={() => { if (hasExistingKieaiKey) { setKieaiKey(''); setHasExistingKieaiKey(false) } }}
                    placeholder="din-api-nøgle..."
                    className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKieaiKey(!showKieaiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKieaiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Hent din API-nøgle fra{' '}
                  <a href="https://kie.ai/getting-started" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    kie.ai/getting-started
                  </a>
                </p>
              </div>

              <SectionSaveButton onSave={saveKieai} label="Gem Kie.ai nøgle" />
            </section>

            {/* ── Mealplan AI (separate from article generation) ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  Kostplan AI
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                Separat OpenAI-konfiguration til kostplangenerering. Hvis felterne herunder er tomme, bruges automatisk API-nøglen og modellen fra &quot;OpenAI Tekstgenerering&quot; sektionen ovenfor (pt. <strong>{model || 'gpt-5.2'}</strong>).
              </p>

              {/* Mealplan API Key */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <Key className="inline h-3.5 w-3.5 mr-1" />
                  Kostplan API Key (valgfri)
                </label>
                <div className="relative">
                  <input
                    type={showMealplanKey ? 'text' : 'password'}
                    value={mealplanApiKey}
                    onChange={e => { setMealplanApiKey(e.target.value); setHasExistingMealplanKey(false) }}
                    onFocus={() => { if (hasExistingMealplanKey) { setMealplanApiKey(''); setHasExistingMealplanKey(false) } }}
                    placeholder="sk-... (tom = brug generel nøgle)"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMealplanKey(!showMealplanKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showMealplanKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Brug en separat API-nøgle til kostplaner, eller lad stå tom for at bruge den generelle OpenAI-nøgle.
                </p>
              </div>

              {/* Mealplan Model selector */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  <Cpu className="inline h-3.5 w-3.5 mr-1" />
                  Kostplan AI Model (valgfri)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setMealplanModel('')}
                    className={cn(
                      'rounded-md border px-3 py-2.5 text-left transition-colors',
                      !mealplanModel
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    <span className="block text-sm font-medium">Samme som artikler</span>
                    <span className="block text-[11px] opacity-70">Bruger: {model || 'gpt-5.2'}</span>
                  </button>
                  {AVAILABLE_MODELS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMealplanModel(m.id)}
                      className={cn(
                        'rounded-md border px-3 py-2.5 text-left transition-colors',
                        mealplanModel === m.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                      )}
                    >
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block text-[11px] opacity-70">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mealplan SMTP */}
              <div className="border-t border-border pt-4 mt-2">
                <p className="text-sm font-medium text-foreground mb-3 flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-accent" />
                  Kostplan Email (SMTP)
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Separat SMTP-konto til afsendelse af kostplaner. Hvis felterne er tomme, bruges den generelle SMTP fra Hosting &amp; Email.
                  <br />
                  <span className="text-muted-foreground/70">One.com: host = <code className="px-1 py-0.5 rounded bg-sage/20 text-xs">send.one.com</code>, port = <code className="px-1 py-0.5 rounded bg-sage/20 text-xs">465</code></span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">SMTP Host</label>
                    <input
                      type="text"
                      value={mealplanSmtpHost}
                      onChange={e => setMealplanSmtpHost(e.target.value)}
                      placeholder="send.one.com"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">SMTP Port</label>
                    <input
                      type="text"
                      value={mealplanSmtpPort}
                      onChange={e => setMealplanSmtpPort(e.target.value)}
                      placeholder="465"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">SMTP Bruger (email)</label>
                    <input
                      type="email"
                      value={mealplanSmtpUser}
                      onChange={e => setMealplanSmtpUser(e.target.value)}
                      placeholder="meal@shiftingsource.com"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">SMTP Adgangskode</label>
                    <div className="relative">
                      <input
                        type={showMealplanSmtpPassword ? 'text' : 'password'}
                        value={mealplanSmtpPassword}
                        onChange={e => { setMealplanSmtpPassword(e.target.value); setHasExistingMealplanSmtpPassword(false) }}
                        onFocus={() => { if (hasExistingMealplanSmtpPassword) { setMealplanSmtpPassword(''); setHasExistingMealplanSmtpPassword(false) } }}
                        placeholder="Adgangskode til email-kontoen"
                        className="w-full h-9 rounded-md border border-input bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={() => setShowMealplanSmtpPassword(!showMealplanSmtpPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showMealplanSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Afsender-email</label>
                    <input
                      type="email"
                      value={mealplanFromEmail}
                      onChange={e => setMealplanFromEmail(e.target.value)}
                      placeholder="meal@shiftingsource.com"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tom = bruger SMTP Bruger</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Afsender-navn</label>
                    <input
                      type="text"
                      value={mealplanFromName}
                      onChange={e => setMealplanFromName(e.target.value)}
                      placeholder="Shifting Source Kostplaner"
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              <SectionSaveButton onSave={saveMealplanAI} label="Gem kostplan-indstillinger" />
            </section>

            {/* ── AI Prompt Management ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  {t('admin.promptManagement', 'AI Prompts')}
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                {t('admin.promptManagementDesc', 'Administrer alle AI system-prompts samlet. Lad felterne stå tomme for at bruge standard-prompts.')}
              </p>

              {/* Prompt type selector */}
              <div className="flex gap-1 bg-sage/10 rounded-md p-1">
                <button
                  onClick={() => setPromptSection('chat')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    promptSection === 'chat'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sage/20'
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat
                </button>
                <button
                  onClick={() => setPromptSection('article')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    promptSection === 'article'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sage/20'
                  )}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Artikler
                </button>
                <button
                  onClick={() => setPromptSection('mealplan')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    promptSection === 'mealplan'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sage/20'
                  )}
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Kostplaner
                </button>
                <button
                  onClick={() => setPromptSection('image')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    promptSection === 'image'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sage/20'
                  )}
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Billeder
                </button>
                <button
                  onClick={() => setPromptSection('video')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors',
                    promptSection === 'video'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sage/20'
                  )}
                >
                  <Video className="h-3.5 w-3.5" />
                  Video
                </button>
              </div>

              {/* Chat Prompts (with language tabs) */}
              {promptSection === 'chat' && (
                <div className="space-y-4">
                  <div className="rounded-md bg-sage/10 border border-sage/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Chat-prompts bruges af AI-assistenten</strong> på hjemmesiden. Der er én prompt per sprog.
                    </p>
                  </div>
                  <div className="flex gap-1 bg-sage/5 rounded-md p-1">
                    {(['da', 'en', 'se'] as const).map(lng => (
                      <button
                        key={lng}
                        onClick={() => setPromptTab(lng)}
                        className={cn(
                          'flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors',
                          promptTab === lng
                            ? 'bg-accent text-accent-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-sage/20'
                        )}
                      >
                        {lng === 'da' ? 'Dansk' : lng === 'en' ? 'English' : 'Svenska'}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium">
                        Chat System Prompt ({promptTab.toUpperCase()})
                      </label>
                      <button
                        onClick={() => {
                          const setter = promptTab === 'da' ? setChatPromptDa : promptTab === 'en' ? setChatPromptEn : setChatPromptSe
                          setter(DEFAULT_PROMPTS[promptTab] || '')
                        }}
                        className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Nulstil til standard
                      </button>
                    </div>
                    <textarea
                      value={promptTab === 'da' ? chatPromptDa : promptTab === 'en' ? chatPromptEn : chatPromptSe}
                      onChange={e => {
                        const setter = promptTab === 'da' ? setChatPromptDa : promptTab === 'en' ? setChatPromptEn : setChatPromptSe
                        setter(e.target.value)
                      }}
                      placeholder="Skriv din brugerdefinerede prompt her..."
                      rows={16}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Definerer chat-assistentens rolle, begrænsninger og tone. Chatten er begrænset til keto/faste-emner og hjemmesidens indhold.
                    </p>
                  </div>
                  <SectionSaveButton onSave={saveChatPrompts} label="Gem chat-prompts" />
                </div>
              )}

              {/* Article Generation Prompt */}
              {promptSection === 'article' && (
                <div className="space-y-3">
                  <div className="rounded-md bg-sage/10 border border-sage/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Denne prompt bruges når du genererer artikler</strong> fra kildetekst (Admin → Blog → Ny artikel).
                      Den instruerer AI'en i skrivestil, output-format (JSON med da/en/se), og kategorisering.
                      {!articlePrompt && ' Standard-prompten vises nedenfor — rediger den gerne.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium">
                      Artikelgenerering System Prompt
                    </label>
                    <button
                      onClick={() => setArticlePrompt('')}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Nulstil til standard
                    </button>
                  </div>
                  <textarea
                    value={articlePrompt || DEFAULT_ARTICLE_PROMPT}
                    onChange={e => setArticlePrompt(e.target.value === DEFAULT_ARTICLE_PROMPT ? '' : e.target.value)}
                    rows={12}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {articlePrompt ? 'Brugertilpasset prompt aktiv' : 'Viser standard-prompt — rediger for at tilpasse'}
                  </p>
                  <SectionSaveButton onSave={saveArticlePrompt} label="Gem artikel-prompt" />
                </div>
              )}

              {/* Image Generation Prompts (separate for recipes and articles) */}
              {promptSection === 'image' && (
                <div className="space-y-5">
                  <div className="rounded-md bg-sage/10 border border-sage/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Billed-prompts bruges til AI-billedgenerering</strong> (Kie.ai / Nanobanana Pro).
                      Der er to separate prompts — én for <strong>opskriftsbilleder</strong> (madfotografi) og én for <strong>artikelbilleder</strong> (editorial/konceptuelt).
                      Prompten instruerer OpenAI i at generere en visuel beskrivelse, som derefter sendes til billed-AI'en.
                    </p>
                  </div>

                  {/* Recipe Image Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium">
                        Opskrifter — Billed-prompt
                      </label>
                      <button
                        onClick={() => setImagePromptRecipe('')}
                        className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Nulstil
                      </button>
                    </div>
                    <textarea
                      value={imagePromptRecipe || DEFAULT_IMAGE_PROMPT_RECIPE}
                      onChange={e => setImagePromptRecipe(e.target.value === DEFAULT_IMAGE_PROMPT_RECIPE ? '' : e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {imagePromptRecipe ? 'Brugertilpasset' : 'Standard-prompt'} — Professionelt madfotografi med kulturel kontekst
                    </p>
                    <SectionSaveButton onSave={saveImagePromptRecipe} label="Gem opskrift-prompt" />
                  </div>

                  {/* Article Image Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium">
                        Artikler — Billed-prompt
                      </label>
                      <button
                        onClick={() => setImagePromptArticle('')}
                        className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Nulstil
                      </button>
                    </div>
                    <textarea
                      value={imagePromptArticle || DEFAULT_IMAGE_PROMPT_ARTICLE}
                      onChange={e => setImagePromptArticle(e.target.value === DEFAULT_IMAGE_PROMPT_ARTICLE ? '' : e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {imagePromptArticle ? 'Brugertilpasset' : 'Standard-prompt'} — Editorial/konceptuel fotografi til forskningsartikler
                    </p>
                    <SectionSaveButton onSave={saveImagePromptArticle} label="Gem artikel billed-prompt" />
                  </div>
                </div>
              )}

              {/* Video Prompts */}
              {promptSection === 'video' && (
                <div className="space-y-6">
                  <div className="rounded-md bg-sage/10 border border-sage/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Video-prompts bruges til at generere AI-videoscripts</strong> for explainer-videoer.
                      Artikelprompten laver konceptuelle explainer-videoer. Opskriftprompten laver madlavningsvideoer med automatisk valg af køkkentype (Nordisk, Middelhavet, Fransk, Asiatisk, Moderne).
                      Stil-variationer injiceres automatisk for visuelt varierede resultater.
                    </p>
                  </div>

                  {/* Article Video Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium">
                        Artikler — Video-prompt
                      </label>
                      <button
                        onClick={() => setVideoPromptArticle('')}
                        className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Nulstil
                      </button>
                    </div>
                    <textarea
                      value={videoPromptArticle || DEFAULT_VIDEO_PROMPT_ARTICLE}
                      onChange={e => setVideoPromptArticle(e.target.value === DEFAULT_VIDEO_PROMPT_ARTICLE ? '' : e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {videoPromptArticle ? 'Brugertilpasset' : 'Standard-prompt'} — Explainer-videoer med Hook → Context → Key Insight → Closing struktur
                    </p>
                    <SectionSaveButton onSave={saveVideoPromptArticle} label="Gem artikel video-prompt" />
                  </div>

                  {/* Recipe Video Prompt */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium">
                        Opskrifter — Video-prompt
                      </label>
                      <button
                        onClick={() => setVideoPromptRecipe('')}
                        className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Nulstil
                      </button>
                    </div>
                    <textarea
                      value={videoPromptRecipe || DEFAULT_VIDEO_PROMPT_RECIPE}
                      onChange={e => setVideoPromptRecipe(e.target.value === DEFAULT_VIDEO_PROMPT_RECIPE ? '' : e.target.value)}
                      rows={10}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[150px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {videoPromptRecipe ? 'Brugertilpasset' : 'Standard-prompt'} — Madlavningsvideoer med 5 kulturelle køkkener og appetitsvækkende visuals
                    </p>
                    <SectionSaveButton onSave={saveVideoPromptRecipe} label="Gem opskrift video-prompt" />
                  </div>
                </div>
              )}

              {/* Meal Plan Prompt */}
              {promptSection === 'mealplan' && (
                <div className="space-y-3">
                  <div className="rounded-md bg-sage/10 border border-sage/20 p-3">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Denne prompt bruges ved generering af kostplaner</strong> fra beregneren.
                      Den instruerer AI&apos;en i kostplanens format, struktur og detaljeniveau.
                      Klientens profildata (kalorier, måltider, præferencer) indsættes automatisk.
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium">
                      Kostplan System Prompt
                    </label>
                    <button
                      onClick={() => setMealPlanPrompt('')}
                      className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Nulstil til standard
                    </button>
                  </div>
                  <textarea
                    value={mealPlanPrompt}
                    onChange={e => setMealPlanPrompt(e.target.value)}
                    placeholder="Standard-prompten bruges hvis feltet er tomt..."
                    rows={14}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[250px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {mealPlanPrompt ? 'Brugertilpasset prompt aktiv' : 'Standard-prompt bruges — tilføj din egen for at tilpasse'}
                  </p>
                  <SectionSaveButton onSave={saveMealPlanPrompt} label="Gem kostplan-prompt" />
                </div>
              )}
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB 2: Sociale Medier                      */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'social' && (
          <>
            {/* ── Profile Links ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  {t('admin.socialMedia', 'Profil-links')}
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                Links til dine sociale medier. De vises i sidefoden på hjemmesiden.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                    <Instagram className="h-3.5 w-3.5" /> Instagram
                  </label>
                  <input
                    type="url"
                    value={socialInstagram}
                    onChange={e => setSocialInstagram(e.target.value)}
                    placeholder="https://instagram.com/shiftingsource"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                    <Youtube className="h-3.5 w-3.5" /> YouTube
                  </label>
                  <input
                    type="url"
                    value={socialYoutube}
                    onChange={e => setSocialYoutube(e.target.value)}
                    placeholder="https://youtube.com/@shiftingsource"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.48a8.2 8.2 0 004.76 1.52V7.56a4.84 4.84 0 01-1-.87z" /></svg>
                    TikTok
                  </label>
                  <input
                    type="url"
                    value={socialTiktok}
                    onChange={e => setSocialTiktok(e.target.value)}
                    placeholder="https://tiktok.com/@shiftingsource"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
                    <Facebook className="h-3.5 w-3.5" /> Facebook
                  </label>
                  <input
                    type="url"
                    value={socialFacebook}
                    onChange={e => setSocialFacebook(e.target.value)}
                    placeholder="https://facebook.com/shiftingsource"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <SectionSaveButton onSave={saveSocial} label="Gem profil-links" />
            </section>

            {/* ── Social Publisher Quick Link ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  Social Publisher
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                Forbind dine sociale medier konti for at publicere opslag direkte fra hjemmesiden. Administrer OAuth-forbindelser, opret opslag og planlæg publicering.
              </p>

              <Link
                to="/admin/social-publisher"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-accent/10 border border-accent/30 text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
              >
                <Share2 className="h-4 w-4" />
                Åbn Social Publisher
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Link>
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB 3: SEO & Sikkerhed                     */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'seo' && (
          <>
            {/* ── SEO Grundindstillinger ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">SEO Grundindstillinger</h2>
              </div>

              <p className="text-sm text-muted-foreground">
                Disse indstillinger bruges til Open Graph tags, canonical URLs og sitemap-generering.
              </p>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      <Globe className="inline h-3.5 w-3.5 mr-1" />
                      Site URL (produktions-domæne)
                    </label>
                    <input
                      type="url"
                      value={siteUrl}
                      onChange={e => setSiteUrl(e.target.value)}
                      placeholder="https://shiftingsource.com"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Bruges i canonical tags, hreflang, Open Graph og sitemap.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Site-navn</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={e => setSiteName(e.target.value)}
                      placeholder="Shifting Source"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Bruges i OG site_name, JSON-LD author og page titles.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Standard meta-beskrivelse (dansk)</label>
                  <textarea
                    value={seoDefaultDescription}
                    onChange={e => setSeoDefaultDescription(e.target.value)}
                    placeholder="Videnskabsbaserede keto-opskrifter, fasteprotokoller og ernæringsvejledning..."
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Fallback-beskrivelse når individuelle sider ikke har deres egen.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Google Search Console verifikation</label>
                  <input
                    type="text"
                    value={seoGoogleVerification}
                    onChange={e => setSeoGoogleVerification(e.target.value)}
                    placeholder="google-site-verification=XXXX..."
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Meta-tag content fra{' '}
                    <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      Google Search Console
                    </a>.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Google Analytics (GA4) Measurement ID</label>
                  <input
                    type="text"
                    value={gaMeasurementId}
                    onChange={e => setGaMeasurementId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    GA4 Measurement ID fra{' '}
                    <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      Google Analytics
                    </a>. Lad feltet stå tomt for at deaktivere tracking.
                  </p>
                </div>
              </div>

              <SectionSaveButton onSave={saveSeo} label="Gem SEO-indstillinger" />
            </section>

            {/* ── robots.txt ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">robots.txt — Blokerede stier</h2>
              </div>

              <p className="text-sm text-muted-foreground">
                Disse stier udelukkes fra søgemaskiner via robots.txt. Én sti per linje.
              </p>

              <div>
                <textarea
                  value={seoRobotsDisallow}
                  onChange={e => setSeoRobotsDisallow(e.target.value)}
                  rows={5}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Aktuel robots.txt ligger i <code className="px-1 py-0.5 rounded bg-sage/20 text-xs">public/robots.txt</code>.
                  Ændringer her gemmes i databasen og kan bruges til at regenerere filen.
                </p>
              </div>

              <SectionSaveButton onSave={saveSeo} label="Gem SEO & robots" />
            </section>

            {/* ── Sikkerhed ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">Sikkerhedsindstillinger</h2>
              </div>

              <p className="text-sm text-muted-foreground">
                HTTP security headers der beskytter mod clickjacking, MIME-sniffing og referrer-leaks.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">X-Frame-Options</label>
                  <select
                    value={securityFrameOptions}
                    onChange={e => setSecurityFrameOptions(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="DENY">DENY — Blokér al framing</option>
                    <option value="SAMEORIGIN">SAMEORIGIN — Tillad kun eget domæne</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Beskytter mod clickjacking-angreb.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Referrer Policy</label>
                  <select
                    value={securityReferrerPolicy}
                    onChange={e => setSecurityReferrerPolicy(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="strict-origin-when-cross-origin">strict-origin-when-cross-origin (anbefalet)</option>
                    <option value="no-referrer">no-referrer — Send aldrig referrer</option>
                    <option value="origin">origin — Kun domænet</option>
                    <option value="same-origin">same-origin — Kun til eget domæne</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Kontrollerer hvad der sendes i Referer-headeren.</p>
                </div>
              </div>

              {/* Rate Limiting */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <h3 className="text-sm font-medium">Rate Limiting</h3>
                <p className="text-xs text-muted-foreground">
                  Begrænser antal forespørgsler per bruger/formular for at forhindre spam og misbrug.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Max forespørgsler</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={rateLimitMax}
                      onChange={e => setRateLimitMax(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Antal tilladte requests per tidsvindue (default: 5).</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Tidsvindue (sekunder)</label>
                    <input
                      type="number"
                      min="10"
                      max="3600"
                      value={rateLimitWindow}
                      onChange={e => setRateLimitWindow(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Periode i sekunder før tælleren nulstilles (default: 60).</p>
                  </div>
                </div>
              </div>

              {/* CSP Extra Domains */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <h3 className="text-sm font-medium">Content Security Policy (CSP) — Ekstra domæner</h3>
                <p className="text-xs text-muted-foreground">
                  Tilføj ekstra domæner der er tilladt i CSP-headeren. Ét domæne per linje (f.eks. <code className="px-1 py-0.5 rounded bg-sage/20 text-xs">https://cdn.example.com</code>).
                  Standard-domæner (Supabase, Google Analytics, OpenAI, Google Fonts) er allerede inkluderet.
                </p>
                <textarea
                  value={cspExtraDomains}
                  onChange={e => setCspExtraDomains(e.target.value)}
                  rows={3}
                  placeholder="https://cdn.example.com&#10;https://api.external-service.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  OBS: CSP-headeren genereres i <code className="px-1 py-0.5 rounded bg-sage/20 text-xs">.htaccess</code>.
                  Efter ændring her skal <code className="px-1 py-0.5 rounded bg-sage/20 text-xs">.htaccess</code> opdateres og deployes via CI/CD.
                  Sundhedstjekket verificerer at de ekstra domæner er inkluderet.
                </p>
              </div>

              {/* Notification settings */}
              <div className="space-y-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-accent" />
                  <h3 className="text-sm font-medium">Dagligt sundhedstjek</h3>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={healthCheckEnabled}
                      onChange={(e) => setHealthCheckEnabled(e.target.checked)}
                      className="rounded border-border accent-accent"
                    />
                    Aktivér automatisk dagligt tjek (kl. 03:00)
                  </label>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Admin notifikations-email
                  </label>
                  <input
                    type="email"
                    value={adminNotificationEmail}
                    onChange={(e) => setAdminNotificationEmail(e.target.value)}
                    placeholder="admin@shiftingsource.com"
                    className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Modtag email kun når noget fejler. Ingen email = ingen notifikation.</p>
                </div>
              </div>

              {/* Dynamic health check status */}
              <div className="bg-sage/5 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    {healthCheck ? (
                      healthCheck.overall_status === 'ok' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                      healthCheck.overall_status === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : <Shield className="h-4 w-4 text-muted-foreground" />}
                    Sundhedstjek
                  </h3>
                  <button
                    onClick={runHealthCheck}
                    disabled={healthLoading}
                    className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', healthLoading && 'animate-spin')} />
                    {healthLoading ? 'Tjekker...' : 'Kør nu'}
                  </button>
                </div>

                {healthCheck ? (
                  <>
                    <div className="grid gap-1.5 text-xs">
                      {healthCheck.checks.map((check, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className={cn(
                            'h-2 w-2 rounded-full mt-1 shrink-0',
                            check.status === 'pass' ? 'bg-green-500' :
                            check.status === 'warn' ? 'bg-amber-400' : 'bg-red-500'
                          )} />
                          <div className="min-w-0 flex-1">
                            <span className="text-foreground">{check.name}</span>
                            <p className="text-muted-foreground truncate">{check.detail}</p>
                          </div>
                          <span className={cn(
                            'ml-auto shrink-0 font-medium',
                            check.status === 'pass' ? 'text-green-600' :
                            check.status === 'warn' ? 'text-amber-600' : 'text-red-600'
                          )}>
                            {check.status === 'pass' ? 'OK' : check.status === 'warn' ? 'Advarsel' : 'Fejl'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span>
                        Sidst kørt: {new Date(healthCheck.run_at).toLocaleString('da-DK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>
                        {healthCheck.total_checks} checks — {healthCheck.failures} fejl, {healthCheck.warnings} advarsler
                      </span>
                    </div>
                    {healthCheck.notification_sent && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Notifikation sendt til admin
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted-foreground py-3 text-center">
                    Ingen sundhedstjek kørt endnu. Klik &quot;Kør nu&quot; for at starte det første tjek, eller vent til kl. 03:00.
                  </div>
                )}
              </div>

              <SectionSaveButton onSave={saveSecurity} label="Gem sikkerhedsindstillinger" />
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* TAB 4: Hosting & Upload                    */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === 'hosting' && (
          <>
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  {t('admin.sftpSettings', 'SFTP / Medieserver')}
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                {t('admin.sftpDescription', 'SFTP-adgang til din medieserver (f.eks. one.com) til upload af billeder og andre mediefiler. Bruges til AI-genererede billeder.')}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Host</label>
                  <input
                    type="text"
                    value={sftpHost}
                    onChange={e => setSftpHost(e.target.value)}
                    placeholder="ssh.example.com"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Port</label>
                  <input
                    type="text"
                    value={sftpPort}
                    onChange={e => setSftpPort(e.target.value)}
                    placeholder="22"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Brugernavn</label>
                  <input
                    type="text"
                    value={sftpUsername}
                    onChange={e => setSftpUsername(e.target.value)}
                    placeholder="sftp-user"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Adgangskode</label>
                  <div className="relative">
                    <input
                      type={showSftpPassword ? 'text' : 'password'}
                      value={sftpPassword}
                      onChange={e => { setSftpPassword(e.target.value); setHasExistingSftpPassword(false) }}
                      onFocus={() => { if (hasExistingSftpPassword) { setSftpPassword(''); setHasExistingSftpPassword(false) } }}
                      placeholder="••••••••"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSftpPassword(!showSftpPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSftpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <SectionSaveButton onSave={saveSftp} label="Gem SFTP-indstillinger" />
            </section>

            {/* ── Email (SMTP) ── */}
            <section className="rounded-lg border border-border bg-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-accent" />
                <h2 className="font-serif text-lg font-bold text-foreground">
                  Email (SMTP)
                </h2>
              </div>

              <p className="text-sm text-muted-foreground">
                SMTP-indstillinger til afsendelse af emails (kostplaner, notifikationer). Brug din one.com email-konto eller en anden SMTP-udbyder.
              </p>

              <div className="rounded-md bg-sage/10 border border-sage/20 p-3">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">one.com SMTP:</strong> Host: <code className="bg-sage/20 px-1 rounded">send.one.com</code>, Port: <code className="bg-sage/20 px-1 rounded">465</code> (SSL). Brugernavn og adgangskode er din one.com email-adresse og dens adgangskode.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                    placeholder="send.one.com"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Port</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                    placeholder="465"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">465 = SSL, 587 = STARTTLS</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Brugernavn (email)</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={e => setSmtpUser(e.target.value)}
                    placeholder="info@shiftingsource.com"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Adgangskode</label>
                  <div className="relative">
                    <input
                      type={showSmtpPassword ? 'text' : 'password'}
                      value={smtpPassword}
                      onChange={e => { setSmtpPassword(e.target.value); setHasExistingSmtpPassword(false) }}
                      onFocus={() => { if (hasExistingSmtpPassword) { setSmtpPassword(''); setHasExistingSmtpPassword(false) } }}
                      placeholder="••••••••"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <hr className="border-border/30" />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Afsender-email</label>
                  <input
                    type="email"
                    value={smtpFromEmail}
                    onChange={e => setSmtpFromEmail(e.target.value)}
                    placeholder="info@shiftingsource.com"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Den adresse modtagere ser i &quot;Fra&quot;-feltet</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Afsender-navn</label>
                  <input
                    type="text"
                    value={smtpFromName}
                    onChange={e => setSmtpFromName(e.target.value)}
                    placeholder="Shifting Source"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-xs text-muted-foreground mt-1">F.eks. &quot;Shifting Source&quot; eller &quot;Anders fra Shifting Source&quot;</p>
                </div>
              </div>

              <SectionSaveButton onSave={saveSmtp} label="Gem email-indstillinger" />
            </section>
          </>
        )}
      </div>
    </div>
  )
}
