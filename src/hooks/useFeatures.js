import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useIsAdmin } from './useAdmin'
import { ALL_FEATURES, DEFAULT_FEATURES } from '../lib/features'

/**
 * Returns the current user's enabled feature set, plus a hasFeature(key)
 * helper. Admin always has every feature; non-admins read their list
 * from public.user_profiles via RLS.
 *
 * loading=true until both auth and the profile fetch resolve, so
 * callers can render skeletons / hold renders until the answer is real
 * (and avoid a flash of unauthorized content).
 */
export function useFeatures() {
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const [features, setFeatures] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (authLoading || adminLoading) return
    if (!user) {
      setFeatures([])
      setLoading(false)
      return
    }
    // Admin always has every feature — skip the DB roundtrip.
    if (isAdmin) {
      setFeatures(ALL_FEATURES)
      setLoading(false)
      return
    }
    // Non-admin: read own profile. If the row is missing (migration
    // not run, or trigger didn't fire for some reason), fall back to
    // the documented defaults so the app stays usable.
    setLoading(true)
    supabase
      .from('user_profiles')
      .select('enabled_features')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('[user_profiles] fetch failed:', error.message)
          setFeatures(DEFAULT_FEATURES)
        } else if (!data) {
          setFeatures(DEFAULT_FEATURES)
        } else {
          setFeatures(Array.isArray(data.enabled_features) ? data.enabled_features : DEFAULT_FEATURES)
        }
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user, authLoading, isAdmin, adminLoading])

  const hasFeature = useCallback(
    (key) => Array.isArray(features) && features.includes(key),
    [features]
  )

  return { features: features || [], hasFeature, loading }
}
