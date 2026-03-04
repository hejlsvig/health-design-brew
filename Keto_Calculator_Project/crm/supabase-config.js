/**
 * Supabase Configuration for CRM
 * Shares the same Supabase project as the React website.
 */
const SUPABASE_URL = 'https://hllprmlkuchhfmexzpad.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbHBybWxrdWNoaGZtZXh6cGFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NDg2MzQsImV4cCI6MjA4NzQyNDYzNH0.oIK951Nyk2Yu9RSWWVBCLXIIGUFFN6rInGrh0VlphvY'

// Initialize Supabase client (loaded via CDN in HTML files)
let _supabase = null

function getSupabase() {
  if (!_supabase) {
    if (typeof supabase === 'undefined' || !supabase.createClient) {
      console.error('[CRM] Supabase JS library not loaded. Include the CDN script before supabase-config.js')
      return null
    }
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
        storage: window.localStorage,
      }
    })
  }
  return _supabase
}

// Export for use in other scripts
window.SUPABASE_URL = SUPABASE_URL
window.SUPABASE_ANON_KEY = SUPABASE_ANON_KEY
window.getSupabase = getSupabase
