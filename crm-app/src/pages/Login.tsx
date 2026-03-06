import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login() {
  const { t } = useTranslation()
  const { signInWithOtp, signInWithPassword, user, crmUser } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'magic' | 'password'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // If already logged in with CRM access, redirect
  if (user && crmUser) {
    navigate('/')
    return null
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error: err } = await signInWithOtp(email)
    if (err) {
      setError(t('login.error'))
    } else {
      setMessage(t('login.linkSent'))
    }
    setLoading(false)
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const { error: err } = await signInWithPassword(email, password)
    if (err) {
      setError(t('login.error'))
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">CRM</span>
          </div>
          <h1 className="font-serif text-2xl text-foreground">{t('login.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('login.subtitle')}</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-xl border border-border shadow-sm p-6">
          {/* Mode toggle */}
          <div className="flex bg-muted rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'magic'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {t('login.magicLink')}
            </button>
            <button
              onClick={() => setMode('password')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'password'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {t('login.passwordTab')}
            </button>
          </div>

          <form onSubmit={mode === 'magic' ? handleMagicLink : handlePasswordLogin}>
            {/* Email */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {t('login.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password (only in password mode) */}
            {mode === 'password' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 rounded-lg bg-success/10 text-success text-sm">
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'magic' ? t('login.sendLink') : t('login.signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
