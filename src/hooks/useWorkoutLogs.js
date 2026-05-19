import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Workout tracker hook — exposes today's checklist (or any selected
 * date), CRUD for completion / weight / note, and computed streak +
 * weekly stats.
 *
 * Auto-populate: when the user opens a date with no workout_logs rows
 * AND there are templates for that weekday, we copy the templates in
 * so the checklist is ready without a setup step. Days with no
 * templates are left alone — the user has defined them as rest days
 * by simply not adding exercises.
 *
 * Date math is local — `YYYY-MM-DD` strings throughout. Day-of-week
 * uses 1 = Monday … 7 = Sunday (matches the schema's check constraint).
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

export function useWorkoutLogs(selectedDate) {
  const dateStr = useMemo(
    () => toLocalISODate(selectedDate || new Date()),
    [selectedDate]
  )
  const dateObj = useMemo(() => parseDateLocal(dateStr), [dateStr])
  const dayOfWeek = useMemo(() => isoDayOfWeek(dateObj), [dateObj])

  const { user } = useAuth()
  const userId = user?.id || null

  const [templates, setTemplates] = useState([])
  const [allLogs, setAllLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [populating, setPopulating] = useState(false)

  // Fetch the current user's templates. We filter by user_id
  // explicitly because the admin role has a read-through RLS policy
  // that would otherwise return every user's templates to the admin
  // and leak them into this personal workout view.
  const fetchTemplates = useCallback(async () => {
    if (!userId) { setTemplates([]); return }
    const { data, error } = await supabase
      .from('workout_templates')
      .select('*')
      .eq('user_id', userId)
      .order('day_of_week', { ascending: true })
      .order('exercise_order', { ascending: true })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[workout_templates] fetch failed:', error.message)
      setTemplates([])
    } else {
      setTemplates(data || [])
    }
  }, [userId])

  // Fetch the current user's workout_logs (same admin-leak concern as
  // templates — scope explicitly).
  const fetchLogs = useCallback(async () => {
    if (!userId) { setAllLogs([]); return }
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('exercise_order', { ascending: true })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[workout_logs] fetch failed:', error.message)
      setAllLogs([])
    } else {
      setAllLogs(data || [])
    }
  }, [userId])

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
    if (templates.length === 0) return
    if (exercisesForDate.length > 0) return
    // No logs for this date yet — seed them if templates exist for
    // this weekday. Days without templates are user-defined rest days.
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
    // Use upsert + ignoreDuplicates so concurrent populate attempts
    // (e.g. Summary and Workout pages both mounting useWorkoutLogs)
    // can't create double rows. The composite unique
    // (user_id, date, exercise_order) is the dedupe target.
    supabase
      .from('workout_logs')
      .upsert(rows, { onConflict: 'user_id,date,exercise_order', ignoreDuplicates: true })
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

  // ─── Program (template) mutations ────────────────────────────────────────
  // These edit the per-user workout_templates rows. Auto-populated logs for
  // future dates pick up the new exercises next time the user opens that
  // day. Past dates are untouched.

  /**
   * Internal: after a template change for `dayOfWeek`, sync the
   * pending workout_logs so the new program takes effect immediately
   * on today and any future occurrences of that weekday. Already-
   * completed logs are preserved (history) — only pending rows get
   * wiped and re-seeded from the fresh template.
   *
   * Reads templates fresh from the DB rather than the hook's local
   * state, since this runs right after a mutation and the local
   * state might not be up-to-date yet.
   */
  const syncLogsToTemplateChange = useCallback(async (dayOfWeek) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = toLocalISODate(today)
    const todayDow = isoDayOfWeek(today)

    // Wipe pending (not-yet-completed) logs for future occurrences
    // of the affected weekday. Past dates remain as historical record.
    await supabase
      .from('workout_logs')
      .delete()
      .eq('day_of_week', dayOfWeek)
      .gt('date', todayStr)
      .eq('completed', false)

    // If today IS the affected weekday, wipe today's pending logs by
    // DATE (not day_of_week) and then re-seed. Going by date is the
    // safety net: older rows may have a stale or null day_of_week
    // value from before per-user templates, and would otherwise slip
    // through a day_of_week-scoped filter and re-appear on screen.
    if (todayDow === dayOfWeek) {
      await supabase
        .from('workout_logs')
        .delete()
        .eq('date', todayStr)
        .eq('completed', false)

      let freshTemplatesQuery = supabase
        .from('workout_templates')
        .select('*')
        .eq('day_of_week', dayOfWeek)
        .order('exercise_order', { ascending: true })
      if (userId) freshTemplatesQuery = freshTemplatesQuery.eq('user_id', userId)
      const { data: freshTemplates } = await freshTemplatesQuery
      if (Array.isArray(freshTemplates) && freshTemplates.length > 0) {
        const rows = freshTemplates.map(t => ({
          date: todayStr,
          day_of_week: t.day_of_week,
          exercise_order: t.exercise_order,
          exercise_name: t.exercise_name,
          sets_reps: t.sets_reps,
          completed: false,
        }))
        await supabase
          .from('workout_logs')
          .upsert(rows, { onConflict: 'user_id,date,exercise_order', ignoreDuplicates: true })
      }
    }
  }, [userId])

  /** Add one exercise to a specific day's program. Assigns the next free
   *  exercise_order automatically. */
  const addProgramExercise = useCallback(async (dayOfWeek, fields) => {
    const dayRows = templates.filter(t => t.day_of_week === dayOfWeek)
    const nextOrder = dayRows.length === 0
      ? 1
      : Math.max(...dayRows.map(r => r.exercise_order)) + 1
    const DEFAULT_DAY_LABEL = {
      1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday',
      5: 'Friday', 6: 'Saturday', 7: 'Sunday',
    }
    const dayLabel = dayRows[0]?.day_label || DEFAULT_DAY_LABEL[dayOfWeek] || 'Workout'
    const payload = {
      day_of_week: dayOfWeek,
      day_label: dayLabel,
      exercise_order: nextOrder,
      exercise_name: fields.exercise_name?.trim() || 'New Exercise',
      sets_reps: fields.sets_reps?.trim() || '3 x 10',
      cue: fields.cue?.trim() || null,
      muscle_group: fields.muscle_group || 'arms',
    }
    const { error } = await supabase.from('workout_templates').insert(payload)
    if (error) throw error
    await fetchTemplates()
    await syncLogsToTemplateChange(dayOfWeek)
    await fetchLogs()
  }, [templates, fetchTemplates, fetchLogs, syncLogsToTemplateChange])

  /** Update an existing template row. */
  const updateProgramExercise = useCallback(async (templateId, fields) => {
    const target = templates.find(t => t.id === templateId)
    const patch = {}
    if (fields.exercise_name != null) patch.exercise_name = fields.exercise_name.trim() || 'Untitled'
    if (fields.sets_reps != null)     patch.sets_reps     = fields.sets_reps.trim()     || '3 x 10'
    if (fields.cue != null)           patch.cue           = fields.cue.trim() || null
    if (fields.muscle_group != null)  patch.muscle_group  = fields.muscle_group
    const { error } = await supabase.from('workout_templates').update(patch).eq('id', templateId)
    if (error) throw error
    await fetchTemplates()
    if (target?.day_of_week) {
      await syncLogsToTemplateChange(target.day_of_week)
      await fetchLogs()
    }
  }, [templates, fetchTemplates, fetchLogs, syncLogsToTemplateChange])

  /** Delete a template row. Compacts the day's exercise_order so the
   *  numbering stays consecutive. */
  const deleteProgramExercise = useCallback(async (templateId) => {
    const target = templates.find(t => t.id === templateId)
    if (!target) return
    const { error: delErr } = await supabase
      .from('workout_templates').delete().eq('id', templateId)
    if (delErr) throw delErr
    // Re-pack exercise_order for that day so we don't end up with gaps
    // like 1,2,4,5 (which would confuse "next free order" later).
    const remaining = templates
      .filter(t => t.day_of_week === target.day_of_week && t.id !== templateId)
      .sort((a, b) => a.exercise_order - b.exercise_order)
    for (let i = 0; i < remaining.length; i++) {
      const want = i + 1
      if (remaining[i].exercise_order !== want) {
        await supabase
          .from('workout_templates')
          .update({ exercise_order: want })
          .eq('id', remaining[i].id)
      }
    }
    await fetchTemplates()
    await syncLogsToTemplateChange(target.day_of_week)
    await fetchLogs()
  }, [templates, fetchTemplates, fetchLogs, syncLogsToTemplateChange])

  /** Wipe every exercise from a single day. Useful when restructuring
   *  a day's program from scratch. */
  const clearProgramForDay = useCallback(async (dayOfWeek) => {
    const { error } = await supabase
      .from('workout_templates')
      .delete()
      .eq('day_of_week', dayOfWeek)
    if (error) throw error
    await fetchTemplates()
    await syncLogsToTemplateChange(dayOfWeek)
    await fetchLogs()
  }, [fetchTemplates, fetchLogs, syncLogsToTemplateChange])

  /** Wipe every exercise across all 7 days. Also clears upcoming
   *  workout_logs so empty days don't auto-populate from a stale cache.
   *  Direct delete (no RPC) — RLS scopes templates appropriately. */
  const clearProgram = useCallback(async () => {
    const { error: tErr } = await supabase
      .from('workout_templates')
      .delete()
      .gte('day_of_week', 1)
    if (tErr) throw tErr
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = toLocalISODate(today)
    await supabase
      .from('workout_logs')
      .delete()
      .gte('date', todayStr)
      .eq('completed', false)
    await Promise.all([fetchTemplates(), fetchLogs()])
  }, [fetchTemplates, fetchLogs])

  /** Delete the user's workout_logs for a specific date. The next time
   *  they view that date, auto-populate refills cleanly from templates.
   *  Useful for "start the day over" and recovering from duplicate-row
   *  edge cases caused by stale client code. RLS scopes the delete to
   *  the current user's rows automatically. */
  const resetDay = useCallback(async (date) => {
    if (!date) return
    const { error } = await supabase
      .from('workout_logs')
      .delete()
      .eq('date', date)
    if (error) throw error
    await fetchLogs()
  }, [fetchLogs])

  // ─── Derived stats ────────────────────────────────────────────────────────

  /**
   * Streak: consecutive scheduled days (looking backwards from today)
   * where every exercise for that date has completed=true. Days the
   * user hasn't programmed (no templates for that weekday) are
   * treated as rest days — skipped without breaking the streak. The
   * cursor stops as soon as a scheduled day has any incomplete (or
   * missing) exercise.
   */
  const streak = useMemo(() => {
    const scheduledDows = new Set(templates.map(t => t.day_of_week))
    // No scheduled days → no streak to count. Returning early also
    // sidesteps an infinite loop: with zero templates every cursor
    // step is a rest-day skip, count never increases, and the
    // safety cap below would never fire.
    if (scheduledDows.size === 0) return 0

    const byDate = new Map()
    for (const l of allLogs) {
      if (!byDate.has(l.date)) byDate.set(l.date, [])
      byDate.get(l.date).push(l)
    }
    const isFullyDone = (rows) =>
      rows && rows.length > 0 && rows.every(r => r.completed === true)
    const isRestDay = (d) => !scheduledDows.has(isoDayOfWeek(d))

    let count = 0
    const cursor = new Date()
    cursor.setHours(0, 0, 0, 0)
    // If today is rest or isn't done yet, don't break — start from yesterday.
    const todayKey = toLocalISODate(cursor)
    if (!isRestDay(cursor) && isFullyDone(byDate.get(todayKey))) count += 1
    cursor.setDate(cursor.getDate() - 1)
    // Cap by calendar distance too, so a long rest-day run doesn't spin.
    let stepsBack = 1
    while (stepsBack <= 365) {
      if (isRestDay(cursor)) {
        cursor.setDate(cursor.getDate() - 1)
        stepsBack += 1
        continue
      }
      const key = toLocalISODate(cursor)
      if (!isFullyDone(byDate.get(key))) break
      count += 1
      cursor.setDate(cursor.getDate() - 1)
      stepsBack += 1
    }
    return count
  }, [allLogs, templates])

  /**
   * Week stats: for the current Mon–Sun window, how many of the 7 days
   * are fully complete + which days. Days the user hasn't programmed
   * (no templates for that weekday) get status `rest` so the dot
   * shows as quietly faded rather than a "missed" workout. Returns:
   *   { completedCount, days: [{ date, dayOfWeek, status }] }
   * where status ∈ 'done'|'partial'|'today'|'missed'|'rest'|'empty'.
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
    const scheduledDows = new Set(templates.map(t => t.day_of_week))

    const days = []
    let completedCount = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(d.getDate() + i)
      const key = toLocalISODate(d)
      const dow = i + 1
      const rows = byDate.get(key) || []
      const isPast = d < today
      const isToday = key === toLocalISODate(today)
      const fullyDone = rows.length > 0 && rows.every(r => r.completed === true)
      const anyDone = rows.some(r => r.completed === true)
      const isScheduled = scheduledDows.has(dow)
      let status = 'empty'
      if (fullyDone) { status = 'done'; completedCount += 1 }
      else if (anyDone) status = 'partial'
      else if (!isScheduled) status = 'rest'
      else if (isToday) status = 'today'
      else if (isPast) status = 'missed'
      days.push({ date: key, dayOfWeek: dow, status, isToday })
    }
    return { completedCount, days, weekStart: toLocalISODate(monday) }
  }, [allLogs, templates])

  // Selected-date convenience flags
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
    allDone: allDoneForDate,
    completedCount: completedCountForDate,
    totalCount: exercises.length,

    // Mutations
    toggleComplete,
    updateNote,
    updateWeight,

    // Program / template management
    templates,
    addProgramExercise,
    updateProgramExercise,
    deleteProgramExercise,
    clearProgram,
    clearProgramForDay,
    resetDay,

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
