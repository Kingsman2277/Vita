import { useState, useEffect, useCallback } from 'react'
import { supabase, usernameToEmail, emailToUsername } from '../lib/supabase'

/**
 * Auth hook — wraps Supabase auth with a username + password UX.
 * Session is persisted by the client; this hook just tracks it in React state.
 */
export function useAuth() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, newSession) => {
      setSession(newSession)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async ({ username, password }) => {
    const email = usernameToEmail(username)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  return {
    session,
    user: session?.user || null,
    username: emailToUsername(session?.user?.email),
    loading,
    signIn,
    signOut,
    isAuthenticated: !!session,
  }
}
