import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  name: string | null
  source: string
  profile_type: string
  language: string
  gender: string | null
  age: number | null
  weight: number | null
  height: number | null
  bmr: number | null
  tdee: number | null
  daily_calories: number | null
  activity_level: string | null
  weight_goal: number | null
  meals_per_day: number | null
  prep_time: string | null
  marketing_consent: boolean
  gdpr_consent: boolean
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isAdmin: boolean
  loading: boolean
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setProfile(data)
      } else {
        console.warn('Profile fetch failed:', error?.message)
        setProfile(null)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setProfile(null)
    }
  }

  const checkAdmin = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('crm_users')
        .select('role, active')
        .eq('id', userId)
        .single()

      if (!error && data && data.role === 'admin' && data.active) {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    } catch {
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          checkAdmin(session.user.id),
        ])
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Listen for auth changes (non-blocking to avoid delaying auth operations)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          Promise.all([
            fetchProfile(session.user.id),
            checkAdmin(session.user.id),
          ]).then(() => setLoading(false))
        } else {
          setProfile(null)
          setIsAdmin(false)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // Use BASE_URL so redirects work in any subdirectory deployment
        emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}profile`,
      },
    })

    // Log fejlede login-forsøg
    if (error) {
      try {
        await supabase.from('consent_log').insert({
          consent_type: 'login_failed',
          granted: false,
          source: 'auth_otp',
          ip_address: null,
          details: JSON.stringify({
            email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Maskér email
            error: error.message,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 200),
          }),
        })
      } catch {
        // Stille fejl — logging må aldrig blokere brugeroplevelsen
      }
    }

    return { error: error as Error | null }
  }

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      try {
        await supabase.from('consent_log').insert({
          consent_type: 'login_failed',
          granted: false,
          source: 'auth_password',
          ip_address: null,
          details: JSON.stringify({
            email: email.replace(/(.{2}).*(@.*)/, '$1***$2'),
            error: error.message,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent.substring(0, 200),
          }),
        })
      } catch {
        // Silent — logging must never block UX
      }
    }

    return { error: error as Error | null }
  }

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      return { error: error as Error | null }
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Password update failed') }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setIsAdmin(false)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, session, profile, isAdmin, loading, signInWithOtp, signInWithPassword, updatePassword, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
