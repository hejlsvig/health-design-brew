import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in your Supabase project details.'
  )
}

// Singleton to prevent multiple instances during HMR / React StrictMode
const globalKey = '__supabase_client__' as const

function getSupabaseClient(): SupabaseClient {
  const existing = (globalThis as unknown as Record<string, SupabaseClient | undefined>)[globalKey]
  if (existing) return existing

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Bypass Navigator Lock API to prevent NavigatorLockAcquireTimeoutError
      // caused by Vite HMR / React StrictMode creating ghost GoTrueClient instances.
      // Safe for single-tab applications.
      lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => {
        return fn()
      },
    },
  })
  ;(globalThis as unknown as Record<string, SupabaseClient>)[globalKey] = client
  return client
}

export const supabase = getSupabaseClient()
