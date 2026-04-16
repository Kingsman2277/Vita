import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const METRIC_KEYS = ['waist', 'chest', 'hips', 'body_fat']

export function useBodyMetrics() {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .order('date', { ascending: true })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[body_metrics] fetch failed:', error.message)
      setMetrics([])
    } else {
      setMetrics(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  const saveEntry = async (entry) => {
    const payload = { date: entry.date, note: entry.note || null }
    for (const k of METRIC_KEYS) {
      const v = entry[k]
      payload[k] = v != null && v !== '' && isFinite(Number(v)) ? Number(v) : null
    }
    if (!payload.date) throw new Error('date is required')
    // Must have at least one metric filled in.
    if (METRIC_KEYS.every(k => payload[k] == null)) {
      throw new Error('enter at least one measurement')
    }
    const { error } = await supabase
      .from('body_metrics')
      .upsert(payload, { onConflict: 'date' })
    if (error) throw error
    await fetchMetrics()
  }

  const deleteEntry = async (id) => {
    const { error } = await supabase.from('body_metrics').delete().eq('id', id)
    if (error) throw error
    await fetchMetrics()
  }

  // Latest non-null value per key (for a "Current Measurements" overview card).
  const latestByKey = {}
  for (const k of METRIC_KEYS) {
    for (let i = metrics.length - 1; i >= 0; i--) {
      if (metrics[i][k] != null) {
        latestByKey[k] = { value: Number(metrics[i][k]), date: metrics[i].date }
        break
      }
    }
  }

  return { metrics, loading, saveEntry, deleteEntry, latestByKey, refetch: fetchMetrics, METRIC_KEYS }
}
