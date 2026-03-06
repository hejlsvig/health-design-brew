import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface CrmUser {
  id: string
  email: string
  name: string | null
  role: 'admin' | 'coach' | 'light' | 'medium'
  active: boolean
  language: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  crmUser: CrmUser | null
  isAdmin: boolean
  loading: boolean
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [crmUser, setCrmUser] = useState<CrmUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadCrmUser(userId: string) {
    const { data } = await supabase
      .from('crm_users')
      .select('id, email, name, role, active, language')
      .eq('id', userId)
      .single()

    if (data && data.active) {
      setCrmUser(data as CrmUser)
      setIsAdmin(data.role === 'admin')
    } else {
      setCrmUser(null)
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        loadCrmUser(s.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s)
        setUser(s?.user ?? null)
        if (s?.user) {
          loadCrmUser(s.user.id).finally(() => setLoading(false))
        } else {
          setCrmUser(null)
          setIsAdmin(false)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signInWithOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    return { error: error as Error | null }
  }

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // Log failed attempt
      await supabase.from('consent_log').insert({
        consent_type: 'data_processing',
        granted: false,
        source: 'signup',
        notes: `CRM login failed: ${error.message}`,
      }).then(() => {})
    }
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setCrmUser(null)
    setIsAdmin(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, session, crmUser, isAdmin, loading, signInWithOtp, signInWithPassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
