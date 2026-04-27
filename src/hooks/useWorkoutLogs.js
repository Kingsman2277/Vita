import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Workout tracker hook — exposes today's checklist (or any selected
 * date), CRUD for completion / weight / note, and computed streak +
 * weekly stats.
 *
 * Auto-populate behavior: when the page asks for a weekday that has
 * no workout_logs rows yet, we copy that weekday's workout_templates
 * rows in. This means the user always sees a fresh checklist without
 * any setup step. We only auto-populate weekdays (Mon-Fri).
 *
 * Date math is local — `YYYY-MM-DD` strings throughout. Day-of-week
 * uses 1 = Monday … 5 = Friday (matches the schema's check constraint).
 */

const MS_DAY = 24 * 60 * 60 * 1000

function toLocalISODate(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateLocal(s) {
  if (!s) return null
  if (s instanceof Date) return s
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Mon=1 ... Fri=5, Sat=6, Sun=0 → 7. Matches DB constraint. */
function isoDayOfWeek(date) {
  const dow = date.getDay() // 0=Sun .. 6=Sat
  return dow === 0 ? 7 : dow
}

/** Is the given Date a weekday (Mon-Fri)? */
function isWeekday(date) {
  const dow = isoDayOfWeek(date)
  return dow >= 1 && dow <= 5
}

export function useWorkoutLogs(selectedDate) {
  const dateStr = useMemo(
    () => toLocalISODate(selectedDate || new Date()),
    [selectedDate]
  )
  const dateObj = useMemo(() => parseDateLocal(dateStr), [dateStr])
  const dayOfWeek = useMemo(() => isoDayOfWeek(dateObj), [dateObj])

  const [templates, setTemplates] = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [populating, setPopulating] = useState(false)

  // Fetch all templates once — small table (40 rows max).
  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('exercise_order', { ascending: true })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[workout_templates] fetch failed:', error.message)
      setTemplates([])
    } else {
      setTemplates(data || [])
    }
  }, [])

  // Fetch all workout_logs (used for streak calc + selected day display).
  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('exercise_order', { ascending: true })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[workout_logs] fetch failed:', error.message)
      setAllLogs([])
    } else {
      setAllLogs(data || [])
    }
  }, [])

  // Initial load — fetch both, then mark not loading.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchTemplates(), fetchLogs()]).then(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [fetchTemplates, fetchLogs])

  // Auto-populate the selected date's logs from the template if the
  // user is viewing a weekday that hasn't been seeded yet.
  const exercisesForDate = useMemo(
    () => allLogs.filter(l => l.date === dateStr).sort((a, b) => a.exercise_order - b.exercise_order),
    [allLogs, dateStr]
  )

  useEffect(() => {
    if (loading || populating) return
    if (!isWeekday(dateObj)) return
    if (templates.length === 0) return
    if (exercisesForDate.length > 0) return
    // No logs for this date yet — seed them.
    const dayTemplates = templates.filter(t => t.day_of_week === dayOfWeek)
    if (dayTemplates.length === 0) return
    setPopulating(true)
    const rows = dayTemplates.map(t => ({
      date: dateStr,
      day_of_week: t.day_of_week,
      exercise_order: t.exercise_order,
      exercise_name: t.exercise_name,
      sets_reps: t.sets_reps,
      completed: false,
    }))
    supabase
      .from('workout_logs')
      .insert(rows)
      .then(({ error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('[workout_logs] seed failed:', error.message)
        }
        return fetchLogs()
      })
      .then(() => setPopulating(false))
      .catch(() => setPopulating(false))
  }, [loading, populating, dateObj, dayOfWeek, dateStr, templates, exercisesForDate.length, fetchLogs])

  const dayTemplate = useMemo(() => {
    const found = templates.find(t => t.day_of_week === dayOfWeek)
    return found ? { day_of_week: found.day_of_week, day_label: found.day_label } : null
  }, [templates, dayOfWeek])

  // Merge template metadata (cue, muscle_group) into each log for
  // display. Logs hold completion state; templates hold the static
  // coaching info.
  const exercises = useMemo(() => {
    return exercisesForDate.map(log => {
      const tmpl = templates.find(
        t => t.day_of_week === log.day_of_week && t.exercise_order === log.exercise_order
      )
      return {
        ...log,
        cue: tmpl?.cue || null,
        muscle_group: tmpl?.muscle_group || null,
      }
    })
  }, [exercisesForDate, templates])

  // ─── Mutations ───────────────────────────────────────────────────────────

  const updateRow = useCallback(async (exerciseOrder, patch) => {
    const target = exercisesForDate.find(e => e.exercise_order === exerciseOrder)
    if (!target) return
    // Optimistic update for snappy UI.
    setAllLogs(prev => prev.map(l => l.id === target.id ? { ...l, ...patch } : l))
    const { error } = await supabase
      .from('workout_logs')
      .update(patch)
      .eq('id', target.id)
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[workout_logs] update failed:', error.message)
      // Re-fetch to recover from optimistic divergence.
      await fetchLogs()
      throw error
    }
  }, [exercisesForDate, fetchLogs])

  const toggleComplete = useCallback(
    (exerciseOrder) => {
      const target = exercisesForDate.find(e => e.exercise_order === exerciseOrder)
      if (!target) return
      return updateRow(exerciseOrder, { completed: !target.completed })
    },
    [exercisesForDate, updateRow]
  )

  const updateNote = useCallback(
    (exerciseOrder, note) => updateRow(exerciseOrder, { note: note || null }),
    [updateRow]
  )

  const updateWeight = useCallback(
    (exerciseOrder, weight) => updateRow(exerciseOrder, { weight_used: weight || null }),
    [updateRow]
  )

  // ─── Derived stats ────────────────────────────────────────────────────────

  /**
   * Streak: consecutive *weekdays* (looking backwards from today) where
   * every exercise for that date has completed=true. Weekends are
   * skipped — they neither count as completed nor break the streak.
   * The cursor stops as soon as a weekday has any incomplete (or no)
   * exercise.
   */
  const streak = useMemo(() => {
    const byDate = new Map()
    for (const l of allLogs) {
      if (!byDate.has(l.date)) byDate.set(l.date, [])
      byDate.get(l.date).push(l)
    }
    const isFullyDone = (rows) =>
      rows && rows.length > 0 && rows.every(r => r.completed === true)

    let count = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    // If today isn't done yet, don't break the streak — start from yesterday.
    const todayKey = toLocalISODate(cursor)
    const todayDone = isFullyDone(byDate.get(todayKey))
    if (todayDone) count += 1
    cursor.setDate(cursor.getDate() - 1)
    while (true) {
      // Skip weekends without breaking the streak.
      while (!isWeekday(cursor)) {
        cursor.setDate(cursor.getDate() - 1)
        // Hard safety cap.
        if (count > 365) break
      }
      const key = toLocalISODate(cursor)
      if (!isFullyDone(byDate.get(key))) break
      count += 1
      cursor.setDate(cursor.getDate() - 1)
      if (count > 365) break
    }
    return count
  }, [allLogs])

  /**
   * Week stats: for the current Mon–Fri window, how many of the 5 days
   * are fully complete + which days. Returns:
   *   { completedCount, days: [{ date, dayOfWeek, status: 'done'|'partial'|'empty'|'today' }] }
   */
  const weekStats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayDow = isoDayOfWeek(today)
    // Find the Monday of this week.
    const monday = new Date(today)
    monday.setDate(monday.getDate() - (todayDow - 1))

    const byDate = new Map()
    for (const l of allLogs) {
      if (!byDate.has(l.date)) byDate.set(l.date, [])
      byDate.get(l.date).push(l)
    }

    const days = []
    let completedCount = 0
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      const key = toLocalISODate(d)
      const rows = byDate.get(key) || []
      const isPast = d < today
      const isToday = key === toLocalISODate(today)
      const fullyDone = rows.length > 0 && rows.every(r => r.completed === true)
      const anyDone = rows.some(r => r.completed === true)
      let status = 'empty'
      if (fullyDone) { status = 'done'; completedCount += 1 }
      else if (anyDone) status = 'partial'
      else if (isToday) status = 'today'
      else if (isPast) status = 'missed'
      days.push({ date: key, dayOfWeek: i + 1, status, isToday })
    }
    return { completedCount, days, weekStart: toLocalISODate(monday) }
  }, [allLogs])

  // Selected-date convenience flags
  const isWeekend = !isWeekday(dateObj)
  const allDoneForDate = exercises.length > 0 && exercises.every(e => e.completed === true)
  const completedCountForDate = exercises.filter(e => e.completed === true).length

  /**
   * Days of the current selected month that have at least one
   * completed exercise — used by DayPicker to show dots.
   */
  const daysWithData = useMemo(() => {
    const days = new Set()
    const y = dateObj.getFullYear()
    const m = dateObj.getMonth()
    for (const log of allLogs) {
      if (!log.completed) continue
      const d = parseDateLocal(log.date)
      if (!d) continue
      if (d.getFullYear() === y && d.getMonth() === m) {
        days.add(d.getDate())
      }
    }
    return days
  }, [allLogs, dateObj])

  /**
   * Aggregate stats for ANY month — used by the Summary page card and
   * for the Workout-page hero subtitle. Returns counts of fully-done
   * weekdays + per-muscle-group exercise tallies.
   */
  const monthStats = useCallback((year, month) => {
    const byDate = new Map()
    for (const l of allLogs) {
      const d = parseDateLocal(l.date)
      if (!d) continue
      if (d.getFullYear() !== year || d.getMonth() !== month) continue
      if (!byDate.has(l.date)) byDate.set(l.date, [])
      byDate.get(l.date).push(l)
    }
    let workoutsCompleted = 0
    let exercisesCompleted = 0
    const muscleGroupCounts = {}
    for (const [, rows] of byDate) {
      const fullyDone = rows.length > 0 && rows.every(r => r.completed === true)
      if (fullyDone) workoutsCompleted += 1
      for (const r of rows) {
        if (!r.completed) continue
        exercisesCompleted += 1
        const tmpl = templates.find(
          t => t.day_of_week === r.day_of_week && t.exercise_order === r.exercise_order
        )
        const grp = tmpl?.muscle_group || 'other'
        muscleGroupCounts[grp] = (muscleGroupCounts[grp] || 0) + 1
      }
    }
    let topMuscleGroup = null
    let topCount = 0
    for (const [grp, n] of Object.entries(muscleGroupCounts)) {
      if (n > topCount) { topCount = n; topMuscleGroup = grp }
    }
    return {
      workoutsCompleted,
      exercisesCompleted,
      muscleGroupCounts,
      topMuscleGroup,
      activeDays: byDate.size,
    }
  }, [allLogs, templates])

  return {
    // Selected day
    dateStr,
    dayOfWeek,
    dayTemplate,
    exercises,
    isWeekend,
    allDone: allDoneForDate,
    completedCount: completedCountForDate,
    totalCount: exercises.length,

    // Mutations
    toggleComplete,
    updateNote,
    updateWeight,

    // Stats
    streak,
    weekStats,
    daysWithData,
    monthStats,

    // Lifecycle
    loading,
    refetch: fetchLogs,
    hasTemplates: templates.length > 0,
  }
}
