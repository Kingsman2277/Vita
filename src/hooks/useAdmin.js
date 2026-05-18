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
 * Fetch a single user's enabled features. Admin-only via the RLS
 * policy on user_profiles (admin can read all rows).
 */
export async function fetchUserFeatures(targetUserId) {
  if (!targetUserId) return []
  const { data, error } = await supabase
    .from('user_profiles')
    .select('enabled_features')
    .eq('user_id', targetUserId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return Array.isArray(data?.enabled_features) ? data.enabled_features : []
}

/**
 * Replace a user's enabled features array. Admin-only — the
 * admin_set_user_features RPC enforces is_admin() server-side.
 */
export async function adminSetUserFeatures(targetUserId, newFeatures) {
  if (!targetUserId) throw new Error('Missing user id')
  if (!Array.isArray(newFeatures)) throw new Error('Features must be an array')
  const { error } = await supabase.rpc('admin_set_user_features', {
    target_user_id: targetUserId,
    new_features: newFeatures,
  })
  if (error) {
    if (/unauthorized/i.test(error.message)) throw new Error('Only the admin can change features')
    throw new Error(error.message)
  }
}

/**
 * Reset a user's password to a new value. Admin-only — the
 * admin_reset_password RPC enforces is_admin() server-side.
 * Returns a Promise that resolves on success, rejects with a clear
 * error message on failure.
 */
export async function adminResetPassword(targetUserId, newPassword) {
  if (!targetUserId) throw new Error('Missing user id')
  if (!newPassword || newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
  const { error } = await supabase.rpc('admin_reset_password', {
    target_user_id: targetUserId,
    new_password: newPassword,
  })
  if (error) {
    // Friendlier wording for the most common errors.
    if (/unauthorized/i.test(error.message)) throw new Error('Only the admin can reset passwords')
    throw new Error(error.message)
  }
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
