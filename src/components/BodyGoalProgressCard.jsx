import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoals } from '../hooks/useGoals'
import { useWeightLogs } from '../hooks/useWeightLogs'
import { parseDateLocal } from '../lib/bodyAnalysis'
import { filterByMonth } from '../lib/dateFilters'

/**
 * Shared live Body Goal progress card — used on Summary and Goals.
 * Pulls from useWeightLogs so the number shown is always the latest
 * logged weight, never the frozen `current_weight` on the goals row.
 */
const STATUS_COLOR = {
  green: 'var(--success)',
  yellow: 'var(--warning)',
  red: 'var(--danger)',
  unknown: 'var(--muted-foreground)',
}
const STATUS_SOFT = {
  green: 'var(--success-soft)',
  yellow: 'var(--warning-soft)',
  red: 'var(--danger-soft)',
  unknown: 'var(--muted)',
}

export default function BodyGoalProgressCard({ anchorMonth } = {}) {
  const navigate = useNavigate()
  const { bodyGoal } = useGoals()
  const { logs: weightLogs, computePace, staleDays, latest } = useWeightLogs()

  const bodyData = bodyGoal?.data
  const targetDate = bodyGoal?.target_date
  const targetWeight = Number(bodyData?.target_weight) || null
  // Latest logged weight is the source of truth; fall back to the
  // legacy frozen field only when there are no entries yet.
  const currentWeight = latest?.weight ?? (bodyData?.current_weight ? Number(bodyData.current_weight) : null)

  const pace = useMemo(
    () => computePace({ target_weight: targetWeight, target_date: targetDate }),
    [computePace, targetWeight, targetDate]
  )
  const weekWeightDelta = useMemo(() => computeWeekWeightDelta(weightLogs), [weightLogs])

  // Sparkline: the month the caller is viewing (Summary) or the current month (Goals).
  const monthWeights = useMemo(() => {
    const now = anchorMonth ? null : new Date()
    const y = anchorMonth?.year ?? now.getFullYear()
    const m = anchorMonth?.month ?? now.getMonth()
    return filterByMonth(weightLogs, y, m, 'date')
  }, [weightLogs, anchorMonth])

  const status = pace?.status || 'unknown'
  const showStale = staleDays != null && staleDays >= 3

  if (!bodyData && weightLogs.length === 0) return null

  return (
    <button
      type="button"
      onClick={() => navigate('/body-goals')}
      aria-label={`Open Body Goals. Current ${currentWeight != null ? `${currentWeight.toFixed(1)} lbs` : 'not set'}${targetWeight ? `, target ${targetWeight} lbs` : ''}.`}
      className="text-left transition-all hover:border-primary/40"
      style={{
        padding: 22,
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--card)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: 'inherit',
        width: '100%',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 12, gap: 12 }}>
        <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: STATUS_COLOR[status],
              boxShadow: `0 0 0 4px ${STATUS_SOFT[status]}`,
              flexShrink: 0,
            }}
          />
          <p className="stat-label" style={{ margin: 0 }}>Body Goal Progress</p>
        </div>
        <svg
          className="card-chevron w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      <div className="flex items-baseline" style={{ gap: 10, marginBottom: 12 }}>
        <span
          className="text-foreground"
          style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}
        >
          {currentWeight != null ? currentWeight.toFixed(1) : '—'}
        </span>
        {currentWeight != null && <span className="text-muted-foreground" style={{ fontSize: 12 }}>lbs</span>}
        {targetWeight && (
          <span className="text-muted-foreground" style={{ fontSize: 12, marginLeft: 'auto' }}>
            goal {targetWeight} lbs
          </span>
        )}
      </div>

      <Sparkline points={monthWeights.map(w => Number(w.weight))} targetWeight={targetWeight} />

      <div
        className="flex items-center justify-between"
        style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}
      >
        {weekWeightDelta != null ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '4px 10px',
              borderRadius: 999,
              background:
                weekWeightDelta < 0
                  ? 'var(--success-soft)'
                  : weekWeightDelta > 0
                  ? 'var(--warning-soft)'
                  : 'var(--muted)',
              color:
                weekWeightDelta < 0
                  ? 'var(--success)'
                  : weekWeightDelta > 0
                  ? 'var(--warning)'
                  : 'var(--muted-foreground)',
              whiteSpace: 'nowrap',
            }}
          >
            {weekWeightDelta > 0 ? '+' : ''}
            {weekWeightDelta.toFixed(1)} lbs vs last wk
          </span>
        ) : (
          <span className="text-muted-foreground" style={{ fontSize: 11 }}>
            Log weekly to see changes
          </span>
        )}
        <span
          className="text-muted-foreground"
          style={{ fontSize: 11, textAlign: 'right', flex: 1, minWidth: 0 }}
        >
          {pace?.label || 'Set a target to track pace'}
        </span>
      </div>

      {showStale && (
        <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 10, fontWeight: 500 }}>
          ⏰ Last logged {staleDays} days ago
        </p>
      )}

      {targetDate && (
        <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 8 }}>
          Target by{' '}
          {new Date(targetDate + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      )}
    </button>
  )
}

function Sparkline({ points, targetWeight }) {
  if (!points || points.length < 2) {
    return (
      <div style={{ height: 36, fontSize: 11, color: 'var(--muted-foreground)' }}>
        Log two or more entries this month for a trend
      </div>
    )
  }
  const width = 220
  const height = 36
  const min = Math.min(...points, targetWeight || Infinity)
  const max = Math.max(...points, targetWeight || -Infinity)
  const range = max - min || 1
  const step = width / (points.length - 1)
  const y = v => height - ((v - min) / range) * (height - 6) - 3
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const targetY = targetWeight ? y(targetWeight) : null
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {targetY != null && (
        <line
          x1={0}
          x2={width}
          y1={targetY}
          y2={targetY}
          stroke="var(--warning)"
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.6}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke="var(--goal-body)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={y(v)}
          r={i === points.length - 1 ? 3 : 1.5}
          fill="var(--goal-body)"
        />
      ))}
    </svg>
  )
}

function computeWeekWeightDelta(weightLogs) {
  if (!weightLogs || weightLogs.length === 0) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const avg = (offsetStart, offsetEnd) => {
    const end = new Date(now)
    end.setDate(end.getDate() - offsetStart)
    const start = new Date(now)
    start.setDate(start.getDate() - offsetEnd)
    const inRange = weightLogs.filter(w => {
      const d = parseDateLocal(w.date)
      return d && d >= start && d <= end
    })
    if (inRange.length === 0) return null
    return inRange.reduce((s, w) => s + Number(w.weight), 0) / inRange.length
  }
  const thisWeek = avg(0, 6)
  const lastWeek = avg(7, 13)
  if (thisWeek == null || lastWeek == null) return null
  return thisWeek - lastWeek
}
