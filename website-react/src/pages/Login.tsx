import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const { t } = useTranslation()
  const { signInWithOtp } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signInWithOtp(email)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="container py-20">
      <div className="max-w-md mx-auto">
        {sent ? (
          /* Success state */
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

            <form onSubmit={handleSubmit} className="space-y-4">
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
            </form>

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
