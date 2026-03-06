import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Singleton to prevent multiple instances during HMR
const GLOBAL_KEY = '__crm_supabase_client__'

function getSupabaseClient(): SupabaseClient {
  const g = globalThis as unknown as Record<string, SupabaseClient | undefined>
  if (g[GLOBAL_KEY]) return g[GLOBAL_KEY]

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lock: async (_name: string, _timeout: number, fn: () => Promise<any>) => fn(),
    },
  })

  g[GLOBAL_KEY] = client
  return client
}

export const supabase = getSupabaseClient()
