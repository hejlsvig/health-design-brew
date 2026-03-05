import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowLeft, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type AuthMode = 'magic-link' | 'password'

/** Map common Supabase auth errors to Danish messages */
function friendlyError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Forkert email eller adgangskode.'
  if (msg.includes('Email not confirmed')) return 'Email er ikke bekræftet endnu.'
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'For mange forsøg — vent venligst lidt.'
  if (msg.includes('User not found')) return 'Ingen bruger fundet med denne email.'
  if (msg.includes('invalid_grant') || msg.includes('Invalid Refresh Token')) return 'Session udløbet — prøv igen.'
  return msg
}

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signInWithOtp, signInWithPassword } = useAuth()

  const [mode, setMode] = useState<AuthMode>('magic-link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signInWithOtp(email)

    if (error) {
      setError(friendlyError(error.message))
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signInWithPassword(email, password)

    if (error) {
      setError(friendlyError(error.message))
    } else {
      // Successful password login → go to admin
      navigate('/admin')
    }
    setLoading(false)
  }

  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto">
        {sent ? (
          /* Success state — magic link sent */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-primary">
              {t('auth.linkSent')}
            </h1>
            <p className="text-muted-foreground">
              {t('auth.linkSentDesc', { email })}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('auth.backToHome')}
            </Link>
          </div>
        ) : (
          /* Login form */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="font-serif text-3xl font-bold text-primary">
                {t('auth.loginTitle')}
              </h1>
              <p className="text-muted-foreground">
                {t('auth.loginSubtitle')}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                onClick={() => { setMode('magic-link'); setError(null) }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'magic-link'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Magic Link
              </button>
              <button
                type="button"
                onClick={() => { setMode('password'); setError(null) }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === 'password'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                Adgangskode
              </button>
            </div>

            {mode === 'magic-link' ? (
              /* Magic link form */
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    {t('auth.emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      className="w-full h-11 rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-md bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('auth.sendLink')}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Vi sender et login-link til din email. Klik på linket for at logge ind.
                </p>
              </form>
            ) : (
              /* Password form */
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email-pw" className="text-sm font-medium">
                    {t('auth.emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="email-pw"
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      className="w-full h-11 rounded-md border border-input bg-background pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Adgangskode
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Din adgangskode"
                      className="w-full h-11 rounded-md border border-input bg-background pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-md bg-accent text-accent-foreground font-bold hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {loading ? t('common.loading') : 'Log ind'}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Har du ikke en adgangskode? Log ind med Magic Link først, og opret en adgangskode under din profil.
                </p>
              </form>
            )}

            <p className="text-center text-xs text-muted-foreground">
              <Link to="/" className="text-accent hover:underline">
                {t('auth.backToHome')}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
