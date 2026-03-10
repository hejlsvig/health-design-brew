import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { rateLimit } from '../lib/rateLimit'

interface Props {
  /** Render variant — 'footer' is compact, 'standalone' adds more space */
  variant?: 'footer' | 'standalone'
}

export default function NewsletterSignup({ variant = 'footer' }: Props) {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  // Anti-spam: honeypot field (bots fill hidden fields) + timestamp check
  const [honeypot, setHoneypot] = useState('')
  const [formLoadedAt] = useState(() => Date.now())

  const reset = () => {
    setTimeout(() => setStatus('idle'), 4000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !consent) return

    // Anti-spam checks
    if (honeypot) return // Bot filled the honeypot
    const elapsed = Date.now() - formLoadedAt
    if (elapsed < 2000) return // Submitted too fast (< 2 seconds) — likely a bot

    // Rate limiting: max 3 forsøg per minut
    const { allowed, retryAfter } = rateLimit('newsletter-signup', 3, 60_000)
    if (!allowed) {
      setErrorMsg(`For mange forsøg. Prøv igen om ${retryAfter} sekunder.`)
      setStatus('error')
      reset()
      return
    }

    setStatus('loading')
    setErrorMsg('')

    try {
      // 1. Check if email already exists as an authenticated user profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, newsletter_consent')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (existingProfile) {
        if (existingProfile.newsletter_consent) {
          // Already subscribed
          setStatus('duplicate')
          reset()
          return
        }

        // Update existing profile's newsletter consent
        await supabase
          .from('profiles')
          .update({ newsletter_consent: true })
          .eq('id', existingProfile.id)

        // Log consent (best-effort)
        try {
          await supabase.from('consent_log').insert({
            user_id: existingProfile.id,
            consent_type: 'newsletter',
            granted: true,
            source: 'footer_form',
          })
        } catch (consentErr) {
          console.warn('Consent log insert failed (non-critical):', consentErr)
        }

        setStatus('success')
        setEmail('')
        setConsent(false)
        reset()
        return
      }

      // 2. Check if already in newsletter_subscribers
      const { data: existingSub } = await supabase
        .from('newsletter_subscribers')
        .select('id, is_active')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      if (existingSub) {
        if (existingSub.is_active) {
          setStatus('duplicate')
          reset()
          return
        }

        // Reactivate + update language
        const reactivateLang = i18n.language?.startsWith('sv') ? 'se' : (i18n.language || 'da')
        const reactivateValidLang = ['da', 'en', 'se'].includes(reactivateLang) ? reactivateLang : 'da'
        await supabase
          .from('newsletter_subscribers')
          .update({ is_active: true, unsubscribed_at: null, language: reactivateValidLang })
          .eq('id', existingSub.id)

        // Log consent (best-effort)
        try {
          await supabase.from('consent_log').insert({
            subscriber_id: existingSub.id,
            consent_type: 'newsletter',
            granted: true,
            source: 'footer_form',
          })
        } catch (consentErr) {
          console.warn('Consent log insert failed (non-critical):', consentErr)
        }

        setStatus('success')
        setEmail('')
        setConsent(false)
        reset()
        return
      }

      // 3. New subscriber — insert into newsletter_subscribers
      // Note: we do NOT use .select() after .insert() because RLS only grants
      // INSERT (not SELECT) to anonymous users. The insert itself is sufficient.
      // Detect language: map i18n language to valid DB values (da/en/se)
      const currentLang = i18n.language?.startsWith('sv') ? 'se' : (i18n.language || 'da')
      const validLang = ['da', 'en', 'se'].includes(currentLang) ? currentLang : 'da'

      const { error: insertError } = await supabase
        .from('newsletter_subscribers')
        .insert({
          email: email.toLowerCase().trim(),
          source: 'footer_form',
          is_active: true,
          language: validLang,
        })

      // Handle duplicate email (unique constraint violation: code 23505)
      // This happens when RLS blocks the SELECT check above (non-admin users)
      if (insertError?.code === '23505') {
        setStatus('duplicate')
        reset()
        return
      }
      if (insertError) throw insertError

      // Consent is recorded by the insert itself (source='footer_form' + is_active=true).
      // The consent_log insert is best-effort and may fail for anonymous users due to RLS.
      try {
        await supabase.from('consent_log').insert({
          consent_type: 'newsletter',
          granted: true,
          source: 'footer_form',
        })
      } catch {
        // Non-critical — the newsletter_subscribers row itself documents consent
      }

      setStatus('success')
      setEmail('')
      setConsent(false)
      reset()
    } catch (err: unknown) {
      console.error('Newsletter signup error:', err)
      setErrorMsg(
        err instanceof Error ? err.message : 'Unknown error'
      )
      setStatus('error')
      reset()
    }
  }

  const isFooter = variant === 'footer'

  // Success / duplicate / error feedback
  if (status === 'success') {
    return (
      <div className={`flex items-center gap-2 text-sm ${isFooter ? 'text-green-400' : 'text-green-600'}`}>
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>{t('newsletter.success')}</span>
      </div>
    )
  }

  if (status === 'duplicate') {
    return (
      <div className={`flex items-center gap-2 text-sm ${isFooter ? 'text-amber-400' : 'text-amber-600'}`}>
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{t('newsletter.duplicate')}</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={`flex items-center gap-2 text-sm ${isFooter ? 'text-red-400' : 'text-red-600'}`}>
        <AlertCircle className="h-4 w-4 flex-shrink-0" />
        <span>{errorMsg || t('newsletter.error')}</span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Honeypot: invisible to humans, bots fill it automatically */}
      <input
        type="text"
        name="website_url"
        value={honeypot}
        onChange={e => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
      />
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('footer.emailPlaceholder')}
          className={
            isFooter
              ? 'flex-1 h-9 rounded-md border border-charcoal-foreground/20 bg-charcoal-foreground/10 px-3 text-sm text-charcoal-foreground placeholder:text-charcoal-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent'
              : 'flex-1 h-10 rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent'
          }
        />
        <button
          type="submit"
          disabled={status === 'loading' || !consent}
          className={
            isFooter
              ? 'h-9 w-9 flex items-center justify-center rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              : 'h-10 px-4 flex items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium'
          }
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* GDPR consent checkbox */}
      <label className={`flex items-start gap-2 cursor-pointer ${isFooter ? 'text-xs text-charcoal-foreground/50' : 'text-xs text-muted-foreground'}`}>
        <input
          type="checkbox"
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
          className="mt-0.5 rounded border-charcoal-foreground/30 accent-accent"
        />
        <span>
          {t('newsletter.consent')}{' '}
          <Link
            to="/privacy"
            className={isFooter ? 'underline hover:text-charcoal-foreground' : 'underline hover:text-foreground'}
          >
            {t('footer.privacy')}
          </Link>
        </span>
      </label>
    </form>
  )
}
