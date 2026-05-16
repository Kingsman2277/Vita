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

  /**
   * Change the signed-in user's username. Converts the username to
   * the internal fake-email format before calling Supabase.
   * Throws on validation failure (e.g. username already taken).
   */
  const updateUsername = useCallback(async (newUsername) => {
    const clean = String(newUsername || '').trim().toLowerCase()
    if (!clean) throw new Error('Username is required')
    if (!/^[a-z0-9_]{2,32}$/.test(clean)) {
      throw new Error('Username must be 2-32 lowercase letters, digits, or underscores')
    }
    const email = usernameToEmail(clean)
    const { data, error } = await supabase.auth.updateUser({ email })
    if (error) throw error
    return data
  }, [])

  /**
   * Change the signed-in user's password.
   */
  const updatePassword = useCallback(async (newPassword) => {
    const pw = String(newPassword || '')
    if (pw.length < 8) throw new Error('Password must be at least 8 characters')
    const { data, error } = await supabase.auth.updateUser({ password: pw })
    if (error) throw error
    return data
  }, [])

  /**
   * Verify a given password matches the current session's user.
   * Implemented by attempting signInWithPassword with the current
   * email — succeeds silently (refreshing the session JWT) if correct,
   * throws "Current password is incorrect" otherwise.
   *
   * Used by the Settings page to gate destructive changes like
   * password updates.
   */
  const verifyPassword = useCallback(async (password) => {
    const email = session?.user?.email
    if (!email) throw new Error('Not signed in')
    if (!password) throw new Error('Current password is required')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (/invalid login credentials/i.test(error.message)) {
        throw new Error('Current password is incorrect')
      }
      throw error
    }
    return true
  }, [session])

  return {
    session,
    user: session?.user || null,
    username: emailToUsername(session?.user?.email),
    loading,
    signIn,
    signOut,
    updateUsername,
    updatePassword,
    verifyPassword,
    isAuthenticated: !!session,
  }
}
