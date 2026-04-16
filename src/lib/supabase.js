import { createClient } from '@supabase/supabase-js'

const PLACEHOLDER_URL = 'https://placeholder.supabase.co'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl : PLACEHOLDER_URL
const supabaseAnonKey = rawKey.length > 20 ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Keep the user logged in across browser sessions / PWA relaunches.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'vita-auth',
  },
})

export const isConfigured = supabaseUrl !== PLACEHOLDER_URL

// Usernames are mapped to a deterministic fake email so Supabase's
// email-based auth can power a "username + password" login UX.
const USERNAME_DOMAIN = 'vita.local'
export function usernameToEmail(username) {
  return `${String(username || '').trim().toLowerCase()}@${USERNAME_DOMAIN}`
}
export function emailToUsername(email) {
  if (!email) return ''
  const at = email.indexOf('@')
  return at === -1 ? email : email.slice(0, at)
}
