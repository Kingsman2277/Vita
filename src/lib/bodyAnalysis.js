/**
 * Pure analytical helpers for the Body Goals feature.
 * All inputs are assumed to be arrays of `{ date: 'YYYY-MM-DD', weight }` — date
 * ascending or descending, caller's choice; functions sort defensively.
 */

const MS_DAY = 24 * 60 * 60 * 1000

/** Parse a 'YYYY-MM-DD' string as a local-midnight Date (no UTC shift). */
export function parseDateLocal(dateStr) {
  if (!dateStr) return null
  if (dateStr instanceof Date) return dateStr
  const s = String(dateStr)
  // Accept ISO timestamps too, but collapse to date portion.
  const raw = s.includes('T') ? s.slice(0, 10) : s
  const [y, m, d] = raw.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Format a Date (or parsable string) as YYYY-MM-DD in local time. */
export function toLocalISODate(date) {
  const d = date instanceof Date ? date : parseDateLocal(date)
  if (!d) return null
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Integer days between two dates (today - then), local-midnight. */
export function daysBetween(a, b) {
  const da = parseDateLocal(a)
  const db = parseDateLocal(b)
  if (!da || !db) return null
  return Math.round((db - da) / MS_DAY)
}

/** Sort logs ascending by date and drop entries without a date/weight. */
export function sortLogsAsc(logs) {
  return (logs || [])
    .filter(l => l && l.date && l.weight != null && isFinite(Number(l.weight)))
    .map(l => ({ ...l, weight: Number(l.weight) }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/**
 * Trailing N-day moving average. Returns [{ date, weight, avg }] for each
 * logged entry, where `avg` is the average weight of all entries with
 * date within [D - (window-1), D] — i.e. window-day trailing.
 *
 * Null `avg` on days where the window has no entries (shouldn't happen
 * since the current day itself counts, but kept for safety).
 */
export function movingAverage(logs, windowDays = 7) {
  const sorted = sortLogsAsc(logs)
  return sorted.map(point => {
    const end = parseDateLocal(point.date)
    const start = new Date(end)
    start.setDate(start.getDate() - (windowDays - 1))
    const inWindow = sorted.filter(p => {
      const d = parseDateLocal(p.date)
      return d >= start && d <= end
    })
    const avg = inWindow.length
      ? inWindow.reduce((s, p) => s + p.weight, 0) / inWindow.length
      : null
    return { ...point, avg }
  })
}

/**
 * Simple linear regression on {dayIndex -> weight}. Returns
 * { slopePerDay, intercept, count } or null if <2 points.
 * `slopePerDay` is in the same units as `weight` (lbs/day, typically).
 */
export function linearFit(logs) {
  const sorted = sortLogsAsc(logs)
  if (sorted.length < 2) return null
  const t0 = parseDateLocal(sorted[0].date)
  const xs = sorted.map(p => (parseDateLocal(p.date) - t0) / MS_DAY)
  const ys = sorted.map(p => p.weight)
  const n = xs.length
  const sumX = xs.reduce((a, b) => a + b, 0)
  const sumY = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0)
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0)
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slopePerDay: slope, intercept, count: n, t0 }
}

/**
 * Average weight over the last N days from `today`. Returns null if no
 * logs in window.
 */
export function avgInWindow(logs, today, offsetDays, windowDays) {
  const sorted = sortLogsAsc(logs)
  const end = new Date(today)
  end.setDate(end.getDate() - offsetDays)
  const start = new Date(end)
  start.setDate(start.getDate() - (windowDays - 1))
  const inWindow = sorted.filter(p => {
    const d = parseDateLocal(p.date)
    return d >= start && d <= end
  })
  if (inWindow.length === 0) return null
  return {
    avg: inWindow.reduce((s, p) => s + p.weight, 0) / inWindow.length,
    count: inWindow.length,
    start: toLocalISODate(start),
    end: toLocalISODate(end),
  }
}

/**
 * Compute pace against a goal.
 *
 *   logs       — weight entries
 *   target     — { target_weight, target_date: 'YYYY-MM-DD' }
 *   today      — Date (defaults to now)
 *
 * Returns:
 *   {
 *     status: 'green' | 'yellow' | 'red' | 'unknown',
 *     label: string,
 *     projectedDate: 'YYYY-MM-DD' | null,
 *     slopePerDay: number | null,
 *     currentWeight: number | null,
 *     remaining: number | null,   // lbs from current → target (signed: loss is positive)
 *     onTrack: boolean,
 *   }
 *
 * Green  = projected date ≤ target date
 * Yellow = projected date within 14 days after target
 * Red    = >14 days late, or slope in wrong direction
 */
export function computePace(logs, target, today = new Date()) {
  const sorted = sortLogsAsc(logs)
  const latest = sorted[sorted.length - 1]
  const targetWeight = Number(target?.target_weight)
  const targetDate = parseDateLocal(target?.target_date)

  if (!latest || !isFinite(targetWeight)) {
    return {
      status: 'unknown',
      label: 'Log a weight to start tracking pace',
      projectedDate: null,
      slopePerDay: null,
      currentWeight: latest ? latest.weight : null,
      remaining: null,
      onTrack: false,
    }
  }

  const current = latest.weight
  const remaining = current - targetWeight // positive = need to lose

  // Use at most the last 21 entries for the fit — responsive to recent behavior.
  const fitWindow = sorted.slice(-21)
  const fit = linearFit(fitWindow)
  const slope = fit ? fit.slopePerDay : null

  // Already hit the goal.
  if ((remaining <= 0 && targetWeight <= current) || Math.abs(remaining) < 0.05) {
    return {
      status: 'green',
      label: 'Goal reached! 🎉',
      projectedDate: toLocalISODate(latest.date),
      slopePerDay: slope,
      currentWeight: current,
      remaining,
      onTrack: true,
    }
  }

  if (slope == null || fit.count < 2) {
    return {
      status: 'unknown',
      label: 'Need more entries to project pace',
      projectedDate: null,
      slopePerDay: slope,
      currentWeight: current,
      remaining,
      onTrack: false,
    }
  }

  // Weight must move toward the goal. Sign of `remaining` matches sign of needed
  // weekly change; slope must be the OPPOSITE sign of `remaining`.
  const direction = remaining > 0 ? -1 : 1 // -1 = need to lose, +1 = need to gain
  const movingTheRightWay = Math.sign(slope) === direction

  if (!movingTheRightWay) {
    return {
      status: 'red',
      label: remaining > 0 ? 'Gaining — off pace' : 'Losing — off pace',
      projectedDate: null,
      slopePerDay: slope,
      currentWeight: current,
      remaining,
      onTrack: false,
    }
  }

  // Days needed at current slope to close the gap.
  const daysNeeded = Math.abs(remaining / slope)
  const projected = new Date(today)
  projected.setHours(0, 0, 0, 0)
  projected.setDate(projected.getDate() + Math.round(daysNeeded))
  const projectedIso = toLocalISODate(projected)

  if (!targetDate) {
    return {
      status: 'green',
      label: `At current pace, ${projectedIso}`,
      projectedDate: projectedIso,
      slopePerDay: slope,
      currentWeight: current,
      remaining,
      onTrack: true,
    }
  }

  const diffDays = Math.round((projected - targetDate) / MS_DAY)
  let status = 'green'
  let label = `On pace — projected ${projectedIso}`
  if (diffDays > 14) {
    status = 'red'
    label = `Off pace — ~${diffDays} days late`
  } else if (diffDays > 0) {
    status = 'yellow'
    label = `Slightly behind — ~${diffDays} days late`
  } else if (diffDays < -7) {
    label = `Ahead of pace — projected ${projectedIso}`
  }

  return {
    status,
    label,
    projectedDate: projectedIso,
    slopePerDay: slope,
    currentWeight: current,
    remaining,
    onTrack: status !== 'red',
  }
}

/**
 * Weekly summary for a given week anchor.
 * `weekStart` is a Date (local midnight) representing the Monday of the week.
 * Returns { avg, change, count, start, end }. change = this_avg - prev_avg (null if prev missing).
 */
export function weeklyStats(logs, weekStart) {
  const start = new Date(weekStart)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const prevStart = new Date(start)
  prevStart.setDate(prevStart.getDate() - 7)
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)

  const inRange = (p, s, e) => {
    const d = parseDateLocal(p.date)
    return d >= s && d <= e
  }
  const sorted = sortLogsAsc(logs)
  const thisWeek = sorted.filter(p => inRange(p, start, end))
  const prevWeek = sorted.filter(p => inRange(p, prevStart, prevEnd))
  const avg = thisWeek.length ? thisWeek.reduce((s, p) => s + p.weight, 0) / thisWeek.length : null
  const prevAvg = prevWeek.length ? prevWeek.reduce((s, p) => s + p.weight, 0) / prevWeek.length : null
  return {
    avg,
    prevAvg,
    change: avg != null && prevAvg != null ? avg - prevAvg : null,
    count: thisWeek.length,
    start: toLocalISODate(start),
    end: toLocalISODate(end),
  }
}

/** Monday of the week containing `date`. Returns a Date at local midnight. */
export function mondayOf(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dow = d.getDay() // 0 Sun, 1 Mon, ... 6 Sat
  const offset = (dow + 6) % 7 // days since Monday
  d.setDate(d.getDate() - offset)
  return d
}

/**
 * Consecutive days (ending today) with at least one weight entry.
 */
export function currentStreak(logs, today = new Date()) {
  const daySet = new Set(sortLogsAsc(logs).map(p => toLocalISODate(p.date)))
  const cursor = new Date(today)
  cursor.setHours(0, 0, 0, 0)
  let streak = 0
  // If not logged today, check if logged yesterday — if yes, streak ends yesterday (still 0 for today).
  // Spec is "consecutive days logged"; most natural read is "up to and including today".
  while (daySet.has(toLocalISODate(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/** Days since the most recent entry (0 = today). Returns null if none. */
export function daysSinceLastLog(logs, today = new Date()) {
  const sorted = sortLogsAsc(logs)
  const latest = sorted[sorted.length - 1]
  if (!latest) return null
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  return Math.max(0, daysBetween(latest.date, t))
}

/**
 * Milestones crossed (every `step` lbs). Uses the first logged entry as start.
 * For a loss goal (target < start): steps are start-5, start-10, ... ≥ target.
 * For a gain goal (target > start): start+5, start+10, ...
 *
 * Returns [{ weight, date }] — each milestone's weight and the first logged
 * date where the entry was ≤ (loss) or ≥ (gain) that threshold. Pending
 * milestones (not yet crossed) are omitted.
 */
export function milestonesCrossed(logs, target, step = 5) {
  const sorted = sortLogsAsc(logs)
  if (sorted.length === 0) return []
  const start = sorted[0].weight
  const targetWeight = Number(target?.target_weight)
  const isLoss = isFinite(targetWeight) ? targetWeight < start : sorted[sorted.length - 1].weight < start
  const out = []
  const lowerBound = isFinite(targetWeight) ? targetWeight : -Infinity
  const upperBound = isFinite(targetWeight) ? targetWeight : +Infinity
  if (isLoss) {
    for (let w = start - step; w >= lowerBound; w -= step) {
      const crossed = sorted.find(p => p.weight <= w)
      if (crossed) out.push({ weight: Number(w.toFixed(2)), date: crossed.date })
      else break
    }
  } else {
    for (let w = start + step; w <= upperBound; w += step) {
      const crossed = sorted.find(p => p.weight >= w)
      if (crossed) out.push({ weight: Number(w.toFixed(2)), date: crossed.date })
      else break
    }
  }
  return out
}

/**
 * Logs within the current (calendar) month.
 */
export function logsInMonth(logs, year, month) {
  return sortLogsAsc(logs).filter(p => {
    const d = parseDateLocal(p.date)
    return d && d.getFullYear() === year && d.getMonth() === month
  })
}
