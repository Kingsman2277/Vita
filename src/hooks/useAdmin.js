import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Returns whether the current user is the admin (oldest auth user).
 * Calls the is_admin() Postgres function over RPC so the decision
 * happens server-side and can't be spoofed by client code.
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase.rpc('is_admin').then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        // Most likely cause: admin migration hasn't been run yet.
        // eslint-disable-next-line no-console
        console.warn('[is_admin] rpc failed:', error.message)
      }
      setIsAdmin(!error && data === true)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return { isAdmin, loading }
}

/**
 * Fetches the admin user list with per-user activity counts.
 * Calls admin_list_users() RPC — raises 'unauthorized' for non-admins.
 */
export function useAdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase.rpc('admin_list_users')
    if (err) {
      // eslint-disable-next-line no-console
      console.warn('[admin_list_users] rpc failed:', err.message)
      setError(err.message)
      setUsers([])
    } else {
      setError(null)
      setUsers(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { users, loading, error, refetch }
}

/**
 * Fetches a single user's recent activity (default 14 days).
 * Calls admin_user_recent(target_user_id, days_back) RPC.
 */
export function useAdminUserRecent(targetUserId, daysBack = 14) {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!targetUserId) return
    let cancelled = false
    setLoading(true)
    supabase
      .rpc('admin_user_recent', { target_user_id: targetUserId, days_back: daysBack })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          // eslint-disable-next-line no-console
          console.warn('[admin_user_recent] rpc failed:', err.message)
          setError(err.message)
          setActivity([])
        } else {
          setError(null)
          setActivity(data || [])
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [targetUserId, daysBack])

  return { activity, loading, error }
}
