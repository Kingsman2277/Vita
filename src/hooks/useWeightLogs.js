import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  sortLogsAsc,
  movingAverage,
  computePace,
  weeklyStats,
  mondayOf,
  currentStreak,
  daysSinceLastLog,
  milestonesCrossed,
  avgInWindow,
  logsInMonth,
} from '../lib/bodyAnalysis'

export function useWeightLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .order('date', { ascending: true })
    if (error) {
      // Table missing is the expected case before the migration is run —
      // treat as empty so the UI still renders a helpful empty state.
      // eslint-disable-next-line no-console
      console.warn('[weight_logs] fetch failed:', error.message)
      setLogs([])
    } else {
      setLogs(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Upsert by date — weight_logs.date is UNIQUE so editing an existing day works.
  const saveEntry = async (entry) => {
    const payload = {
      date: entry.date,
      weight: Number(entry.weight),
      mood: entry.mood != null && entry.mood !== '' ? Number(entry.mood) : null,
      energy: entry.energy != null && entry.energy !== '' ? Number(entry.energy) : null,
      note: entry.note || null,
    }
    if (!payload.date) throw new Error('date is required')
    if (!isFinite(payload.weight) || payload.weight <= 0) throw new Error('weight must be positive')
    const { error } = await supabase
      .from('weight_logs')
      // Composite onConflict matches the (user_id, date) unique
      // constraint introduced by the multi-user migration. user_id is
      // auto-filled server-side via the column's default auth.uid().
      .upsert(payload, { onConflict: 'user_id,date' })
    if (error) throw error
    await fetchLogs()
  }

  const deleteEntry = async (id) => {
    const { error } = await supabase.from('weight_logs').delete().eq('id', id)
    if (error) throw error
    await fetchLogs()
  }

  const sorted = useMemo(() => sortLogsAsc(logs), [logs])
  const latest = sorted[sorted.length - 1] || null
  const smoothed = useMemo(() => movingAverage(sorted, 7), [sorted])
  const streak = useMemo(() => currentStreak(sorted), [sorted])
  const staleDays = useMemo(() => daysSinceLastLog(sorted), [sorted])

  return {
    logs: sorted,
    loading,
    saveEntry,
    deleteEntry,
    latest,
    smoothed,
    streak,
    staleDays,
    refetch: fetchLogs,
    // Expose analysis helpers bound to this hook's logs for convenience.
    computePace: (target, today) => computePace(sorted, target, today),
    weeklyStats: (weekStart) => weeklyStats(sorted, weekStart),
    mondayOf,
    milestones: (target, step) => milestonesCrossed(sorted, target, step),
    avgInWindow: (today, offset, window) => avgInWindow(sorted, today, offset, window),
    logsInMonth: (year, month) => logsInMonth(sorted, year, month),
  }
}
