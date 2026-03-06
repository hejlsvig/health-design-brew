import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { fetchFeatureGates, updateFeatureGate, type FeatureGate, type SubscriptionTier } from '@/lib/subscriptions'
import {
  Loader2, Settings, Shield, Check, X as XIcon, Save,
  Globe, Sparkles, Share2, Server, HeartPulse, Sliders, Mail,
  Eye, EyeOff, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react'

/* ─── Helpers ─── */

const TIERS: SubscriptionTier[] = ['free', 'premium', 'pro']

async function saveSetting(key: string, value: string, userId?: string) {
  const { error } = await supabase
    .from('admin_settings')
    .upsert({ key, value, updated_by: userId ?? null, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kunne ikke gemme')
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
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Gemmer...</>
          : saved ? <><Check className="h-4 w-4" />Gemt!</>
          : <><Save className="h-4 w-4" />{label}</>}
      </button>
      {saved && <span className="text-sm text-green-600 font-medium">Gemt</span>}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </div>
  )
}

function SettingInput({ label, value, onChange, type = 'text', help, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  type?: string; help?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
    </div>
  )
}

function PasswordInput({ label, value, onChange, hasExisting, help }: {
  label: string; value: string; onChange: (v: string) => void
  hasExisting: boolean; help?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={hasExisting ? '••••••••' : 'Indtast nøgle...'}
          className="w-full px-3 py-2 pr-10 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, badge }: {
  title: string; icon: typeof Settings; children: React.ReactNode; badge?: string
}) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-medium text-foreground">{title}</h3>
        {badge && <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{badge}</span>}
      </div>
      {children}
    </div>
  )
}

/* ─── Tabs ─── */

type SettingsTab = 'crm' | 'website' | 'email' | 'features' | 'health'

const TABS: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: 'crm', label: 'CRM', icon: Sliders },
  { id: 'website', label: 'Hjemmeside', icon: Globe },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'features', label: 'Features', icon: Shield },
  { id: 'health', label: 'Sundhed', icon: HeartPulse },
]

/* ─── Main Component ─── */

export default function CrmSettings() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tab, setTab] = useState<SettingsTab>('crm')
  const [loading, setLoading] = useState(true)

  // ── CRM settings ──
  const [crmCompanyName, setCrmCompanyName] = useState('')
  const [crmDefaultLang, setCrmDefaultLang] = useState('da')
  const [crmLogoUrl, setCrmLogoUrl] = useState('')
  const [crmReminderDays, setCrmReminderDays] = useState('7')
  const [crmReminderGrace, setCrmReminderGrace] = useState('2')

  // ── Website: AI ──
  const [aiApiKey, setAiApiKey] = useState('')
  const [hasAiKey, setHasAiKey] = useState(false)
  const [aiModel, setAiModel] = useState('gpt-5.2')
  const [kieaiKey, setKieaiKey] = useState('')
  const [hasKieaiKey, setHasKieaiKey] = useState(false)

  // ── Website: Social ──
  const [socialInstagram, setSocialInstagram] = useState('')
  const [socialYoutube, setSocialYoutube] = useState('')
  const [socialTiktok, setSocialTiktok] = useState('')
  const [socialFacebook, setSocialFacebook] = useState('')

  // ── Website: SEO ──
  const [siteUrl, setSiteUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [gaId, setGaId] = useState('')
  const [adminEmail, setAdminEmail] = useState('')

  // ── Website: Hosting ──
  const [ftpHost, setFtpHost] = useState('')
  const [ftpUser, setFtpUser] = useState('')
  const [ftpPass, setFtpPass] = useState('')
  const [hasFtpPass, setHasFtpPass] = useState(false)

  // ── Email ──
  const [resendApiKey, setResendApiKey] = useState('')
  const [hasResendKey, setHasResendKey] = useState(false)
  const [fromEmail, setFromEmail] = useState('')

  // ── Features ──
  const [featureGates, setFeatureGates] = useState<FeatureGate[]>([])

  // ── Health ──
  interface HealthCheck {
    name: string; status: 'pass' | 'warn' | 'fail'; detail: string
  }
  interface HealthResult {
    overall_status: 'ok' | 'warning' | 'error'
    checks: HealthCheck[]; failures: number; warnings: number; total_checks: number
    run_at: string
  }
  const [healthChecks, setHealthChecks] = useState<HealthResult[]>([])
  const [healthLoading, setHealthLoading] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [settingsResult, gates, healthResult] = await Promise.all([
        supabase.from('admin_settings').select('key, value').order('key'),
        fetchFeatureGates(),
        supabase.from('health_checks').select('*').order('run_at', { ascending: false }).limit(5),
      ])

      const s: Record<string, string> = {}
      for (const row of settingsResult.data || []) s[row.key] = row.value || ''

      // CRM
      setCrmCompanyName(s.crm_company_name || '')
      setCrmDefaultLang(s.crm_default_language || 'da')
      setCrmLogoUrl(s.crm_logo_url || '')
      setCrmReminderDays(s.reminder_frequency_days || '7')
      setCrmReminderGrace(s.reminder_grace_days || '2')

      // AI
      if (s.openai_api_key) { setAiApiKey('sk-••••' + s.openai_api_key.slice(-4)); setHasAiKey(true) }
      setAiModel(s.ai_model || 'gpt-5.2')
      if (s.kieai_api_key) { setKieaiKey('••••' + s.kieai_api_key.slice(-4)); setHasKieaiKey(true) }

      // Social
      setSocialInstagram(s.social_instagram || '')
      setSocialYoutube(s.social_youtube || '')
      setSocialTiktok(s.social_tiktok || '')
      setSocialFacebook(s.social_facebook || '')

      // SEO
      setSiteUrl(s.site_url || '')
      setSiteName(s.site_name || '')
      setSeoDescription(s.seo_default_description || '')
      setGaId(s.ga_measurement_id || '')
      setAdminEmail(s.admin_notification_email || '')

      // Hosting
      setFtpHost(s.ftp_host || '')
      setFtpUser(s.ftp_username || '')
      if (s.ftp_password) { setFtpPass('••••' + s.ftp_password.slice(-4)); setHasFtpPass(true) }

      // Email
      if (s.resend_api_key) { setResendApiKey('••••' + s.resend_api_key.slice(-4)); setHasResendKey(true) }
      setFromEmail(s.from_email || '')

      setFeatureGates(gates)
      setHealthChecks((healthResult.data || []) as HealthResult[])
    } catch (err) {
      console.error('Load settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Save callbacks ──
  const uid = user?.id

  const saveCrm = useCallback(async () => {
    await saveSetting('crm_company_name', crmCompanyName, uid)
    await saveSetting('crm_default_language', crmDefaultLang, uid)
    await saveSetting('crm_logo_url', crmLogoUrl, uid)
    await saveSetting('reminder_frequency_days', crmReminderDays, uid)
    await saveSetting('reminder_grace_days', crmReminderGrace, uid)
  }, [crmCompanyName, crmDefaultLang, crmLogoUrl, crmReminderDays, crmReminderGrace, uid])

  const saveAi = useCallback(async () => {
    if (aiApiKey && !aiApiKey.startsWith('sk-••••')) await saveSetting('openai_api_key', aiApiKey, uid)
    await saveSetting('ai_model', aiModel, uid)
    if (kieaiKey && !kieaiKey.startsWith('••••')) await saveSetting('kieai_api_key', kieaiKey, uid)
  }, [aiApiKey, aiModel, kieaiKey, uid])

  const saveSocial = useCallback(async () => {
    await saveSetting('social_instagram', socialInstagram, uid)
    await saveSetting('social_youtube', socialYoutube, uid)
    await saveSetting('social_tiktok', socialTiktok, uid)
    await saveSetting('social_facebook', socialFacebook, uid)
  }, [socialInstagram, socialYoutube, socialTiktok, socialFacebook, uid])

  const saveSeo = useCallback(async () => {
    await saveSetting('site_url', siteUrl, uid)
    await saveSetting('site_name', siteName, uid)
    await saveSetting('seo_default_description', seoDescription, uid)
    await saveSetting('ga_measurement_id', gaId, uid)
    await saveSetting('admin_notification_email', adminEmail, uid)
  }, [siteUrl, siteName, seoDescription, gaId, adminEmail, uid])

  const saveHosting = useCallback(async () => {
    await saveSetting('ftp_host', ftpHost, uid)
    await saveSetting('ftp_username', ftpUser, uid)
    if (ftpPass && !ftpPass.startsWith('••••')) await saveSetting('ftp_password', ftpPass, uid)
  }, [ftpHost, ftpUser, ftpPass, uid])

  const saveEmail = useCallback(async () => {
    if (resendApiKey && !resendApiKey.startsWith('••••')) await saveSetting('resend_api_key', resendApiKey, uid)
    await saveSetting('from_email', fromEmail, uid)
  }, [resendApiKey, fromEmail, uid])

  // ── Feature gates ──
  async function handleToggleGate(featureKey: string, tier: SubscriptionTier, currentEnabled: boolean) {
    try {
      await updateFeatureGate(featureKey, tier, !currentEnabled)
      setFeatureGates((prev) =>
        prev.map((g) => g.feature_key === featureKey && g.tier === tier ? { ...g, is_enabled: !currentEnabled } : g)
      )
    } catch (err) { console.error('Toggle gate error:', err) }
  }

  // ── Health check ──
  async function runHealthCheck() {
    setHealthLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://hllprmlkuchhfmexzpad.supabase.co'}/functions/v1/health-check`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` } }
      )
      const result = await resp.json()
      if (result.checks) {
        const newCheck: HealthResult = {
          overall_status: result.overall_status, checks: result.checks,
          failures: result.failures, warnings: result.warnings, total_checks: result.total_checks,
          run_at: new Date().toISOString(),
        }
        setHealthChecks((prev) => [newCheck, ...prev.slice(0, 4)])
      }
    } catch (err) { console.error('Health check error:', err) }
    finally { setHealthLoading(false) }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  const featureKeys = [...new Set(featureGates.map((g) => g.feature_key))]
  const gateMap: Record<string, Record<string, FeatureGate>> = {}
  for (const gate of featureGates) {
    if (!gateMap[gate.feature_key]) gateMap[gate.feature_key] = {}
    gateMap[gate.feature_key][gate.tier] = gate
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-foreground mb-6">
        <Settings className="w-6 h-6 inline mr-2" />
        {t('crmSettings.title')}
      </h1>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── CRM Tab ── */}
      {tab === 'crm' && (
        <div className="space-y-6 max-w-2xl">
          <SectionCard title="Generelt" icon={Sliders}>
            <div className="space-y-3">
              <SettingInput label="Firmanavn" value={crmCompanyName} onChange={setCrmCompanyName} placeholder="Shifting Source" />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Standardsprog</label>
                <select value={crmDefaultLang} onChange={(e) => setCrmDefaultLang(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="da">Dansk</option>
                  <option value="en">English</option>
                  <option value="se">Svenska</option>
                </select>
              </div>
              <SettingInput label="Logo URL" value={crmLogoUrl} onChange={setCrmLogoUrl} placeholder="https://..." />
            </div>
            <SectionSaveButton onSave={saveCrm} />
          </SectionCard>

          <SectionCard title="Check-in påmindelser" icon={HeartPulse}>
            <div className="grid grid-cols-2 gap-3">
              <SettingInput label="Frekvens (dage)" value={crmReminderDays} onChange={setCrmReminderDays} type="number" help="Hvor ofte der sendes check-in påmindelser" />
              <SettingInput label="Grace period (dage)" value={crmReminderGrace} onChange={setCrmReminderGrace} type="number" help="Dage før påmindelsen sendes" />
            </div>
            <SectionSaveButton onSave={saveCrm} />
          </SectionCard>
        </div>
      )}

      {/* ── Website Tab ── */}
      {tab === 'website' && (
        <div className="space-y-6 max-w-2xl">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Disse indstillinger gælder hjemmesiden (shiftingsource.com)
          </div>

          <SectionCard title="AI & Generering" icon={Sparkles} badge="Hjemmeside">
            <div className="space-y-3">
              <PasswordInput label="OpenAI API Key" value={aiApiKey} onChange={setAiApiKey} hasExisting={hasAiKey} />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">AI Model</label>
                <select value={aiModel} onChange={(e) => setAiModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                  {['gpt-5.2', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <PasswordInput label="Kie.ai API Key" value={kieaiKey} onChange={setKieaiKey} hasExisting={hasKieaiKey} help="Til billedgenerering via Nanobanana Pro" />
            </div>
            <SectionSaveButton onSave={saveAi} />
          </SectionCard>

          <SectionCard title="Sociale Medier" icon={Share2} badge="Hjemmeside">
            <div className="grid grid-cols-2 gap-3">
              <SettingInput label="Instagram" value={socialInstagram} onChange={setSocialInstagram} placeholder="https://instagram.com/..." />
              <SettingInput label="YouTube" value={socialYoutube} onChange={setSocialYoutube} placeholder="https://youtube.com/..." />
              <SettingInput label="TikTok" value={socialTiktok} onChange={setSocialTiktok} placeholder="https://tiktok.com/..." />
              <SettingInput label="Facebook" value={socialFacebook} onChange={setSocialFacebook} placeholder="https://facebook.com/..." />
            </div>
            <SectionSaveButton onSave={saveSocial} />
          </SectionCard>

          <SectionCard title="SEO & Site" icon={Globe} badge="Hjemmeside">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <SettingInput label="Site URL" value={siteUrl} onChange={setSiteUrl} placeholder="https://shiftingsource.com" />
                <SettingInput label="Site navn" value={siteName} onChange={setSiteName} placeholder="Shifting Source" />
              </div>
              <SettingInput label="SEO beskrivelse" value={seoDescription} onChange={setSeoDescription} />
              <div className="grid grid-cols-2 gap-3">
                <SettingInput label="GA Measurement ID" value={gaId} onChange={setGaId} placeholder="G-XXXXXXXXXX" />
                <SettingInput label="Admin notifikation email" value={adminEmail} onChange={setAdminEmail} placeholder="admin@example.com" />
              </div>
            </div>
            <SectionSaveButton onSave={saveSeo} />
          </SectionCard>

          <SectionCard title="Hosting & FTP" icon={Server} badge="Hjemmeside">
            <div className="space-y-3">
              <SettingInput label="FTP Host" value={ftpHost} onChange={setFtpHost} />
              <SettingInput label="FTP Brugernavn" value={ftpUser} onChange={setFtpUser} />
              <PasswordInput label="FTP Adgangskode" value={ftpPass} onChange={setFtpPass} hasExisting={hasFtpPass} />
            </div>
            <SectionSaveButton onSave={saveHosting} />
          </SectionCard>
        </div>
      )}

      {/* ── Email Tab ── */}
      {tab === 'email' && (
        <div className="space-y-6 max-w-2xl">
          <SectionCard title="Email-afsendelse" icon={Mail}>
            <div className="space-y-3">
              <PasswordInput label="Resend API Key" value={resendApiKey} onChange={setResendApiKey} hasExisting={hasResendKey} help="API-nøgle fra resend.com" />
              <SettingInput label="Afsender-email" value={fromEmail} onChange={setFromEmail} placeholder="noreply@shiftingsource.com" help="Standard afsenderadresse for automatiske emails" />
            </div>
            <SectionSaveButton onSave={saveEmail} />
          </SectionCard>

          <SectionCard title="SMTP-konfiguration" icon={Server}>
            <p className="text-sm text-muted-foreground">
              Fuld SMTP send/modtag-integration kommer i næste fase. Her vil du kunne konfigurere individuelle email-konti per CRM-bruger med SMTP og IMAP-indstillinger.
            </p>
          </SectionCard>
        </div>
      )}

      {/* ── Features Tab ── */}
      {tab === 'features' && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Feature</th>
                {TIERS.map((tier) => (
                  <th key={tier} className="px-4 py-3 text-center text-xs text-muted-foreground uppercase tracking-wider capitalize">{tier}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {featureKeys.map((fk) => (
                <tr key={fk} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{fk.replace(/_/g, ' ')}</p>
                    {gateMap[fk]?.free?.description && <p className="text-xs text-muted-foreground">{gateMap[fk].free.description}</p>}
                  </td>
                  {TIERS.map((tier) => {
                    const gate = gateMap[fk]?.[tier]
                    if (!gate) return <td key={tier} className="px-4 py-3 text-center text-muted-foreground">—</td>
                    return (
                      <td key={tier} className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleGate(fk, tier, gate.is_enabled)}
                          className={`p-1.5 rounded-full transition-colors ${
                            gate.is_enabled ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-red-100 text-red-400 hover:bg-red-200'
                          }`}
                        >
                          {gate.is_enabled ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {featureKeys.length === 0 && <p className="text-center text-muted-foreground py-12">Ingen feature gates konfigureret</p>}
        </div>
      )}

      {/* ── Health Tab ── */}
      {tab === 'health' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">Seneste sundhedstjek</h2>
            <button
              onClick={runHealthCheck}
              disabled={healthLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {healthLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Kør sundhedstjek
            </button>
          </div>

          {healthChecks.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t('crmSettings.noHealthChecks')}</p>
          ) : (
            healthChecks.map((hc, i) => {
              const status = hc.overall_status
              return (
                <div key={i} className={`p-4 rounded-xl border ${
                  status === 'ok' ? 'border-green-200 bg-green-50' :
                  status === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center gap-3">
                    {status === 'ok' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                     status === 'warning' ? <AlertTriangle className="w-5 h-5 text-amber-600" /> :
                     <XCircle className="w-5 h-5 text-red-600" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">{status}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(hc.run_at).toLocaleString()} • {hc.total_checks} checks
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-green-600">{hc.total_checks - hc.failures - hc.warnings} pass</span>
                      {hc.warnings > 0 && <span className="ml-2 text-amber-600">{hc.warnings} warn</span>}
                      {hc.failures > 0 && <span className="ml-2 text-red-600">{hc.failures} fail</span>}
                    </div>
                  </div>
                  {i === 0 && hc.checks && (
                    <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
                      {hc.checks.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-2 text-xs">
                          {c.status === 'pass' ? <CheckCircle2 className="w-3 h-3 text-green-600" /> :
                           c.status === 'warn' ? <AlertTriangle className="w-3 h-3 text-amber-600" /> :
                           <XCircle className="w-3 h-3 text-red-600" />}
                          <span className="font-medium text-foreground">{c.name}</span>
                          <span className="text-muted-foreground truncate">{c.detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
