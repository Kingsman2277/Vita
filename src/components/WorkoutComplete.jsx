import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { AreaChart, Button, Card, IconButton, StatTile, TagPill } from './ui'
import { useWeightLogs } from '../hooks/useWeightLogs'
import { useGoals } from '../hooks/useGoals'

/**
 * Full-screen confirmation after the last exercise of the day is ticked
 * (docs/redesign §6.3, mockups/d3-workout.png).
 *
 * Everything here comes from data the app already tracks. The reference
 * images show duration, calories burned and heart rate — none of which
 * exist in workout_logs, so none of them appear.
 */

// `sets_reps` is free text on workout_templates: "3 x 10", "3x10",
// "4 sets x 8". Parse defensively and let the caller hide any figure we
// could not derive rather than printing a confident wrong number.
function parseSetsReps(text) {
  const m = String(text || '').match(/(\d+)\s*(?:sets?)?\s*[x×]\s*(\d+)/i)
  if (!m) return null
  const sets = Number(m[1])
  const reps = Number(m[2])
  if (!sets || !reps) return null
  return { sets, reps }
}

function SummaryCell({ label, value }) {
  return (
    <div>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="text-[17px] font-bold text-fg tabular-nums mt-0.5">{value}</p>
    </div>
  )
}

export default function WorkoutComplete({ open, onClose, exercises = [], dayLabel, dateLabel, streak = 0, weekStats }) {
  const { logs } = useWeightLogs()
  const { bodyGoal } = useGoals()

  const summary = useMemo(() => {
    let sets = 0
    let reps = 0
    let volume = 0
    let parsedAll = exercises.length > 0
    let top = null

    for (const ex of exercises) {
      const parsed = parseSetsReps(ex.sets_reps)
      if (!parsed) { parsedAll = false; continue }
      sets += parsed.sets
      reps += parsed.sets * parsed.reps
      const weight = Number(ex.weight_used)
      if (isFinite(weight) && weight > 0) {
        volume += parsed.sets * parsed.reps * weight
        if (!top || weight > top.weight) top = { weight, name: ex.exercise_name }
      }
    }

    return { sets, reps, volume, parsedAll, top }
  }, [exercises])

  const series = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    return logs
      .filter(l => new Date(`${l.date}T00:00:00`) >= cutoff)
      .map(l => ({ d: l.date.slice(5), lb: Number(l.weight) }))
      .filter(p => isFinite(p.lb))
  }, [logs])

  if (!open) return null

  const target = Number(bodyGoal?.target_weight)
  const latest = series.length ? series[series.length - 1].lb : null
  const sinceFirst = series.length > 1 ? latest - series[0].lb : null

  return createPortal(
    <div className="fixed inset-0 z-[110] bg-bg overflow-y-auto" role="dialog" aria-modal="true" aria-label="Workout logged">
      {/* Sunburst: repeating wedges masked to a soft circle, with an
          orange glow behind the badge. Decorative only. */}
      <div className="absolute inset-x-0 top-0 h-[460px] pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: 'repeating-conic-gradient(from 0deg at 50% 46%, rgba(255,255,255,.07) 0 9deg, transparent 9deg 18deg)',
            maskImage: 'radial-gradient(circle at 50% 46%, #000 30%, transparent 72%)',
            WebkitMaskImage: 'radial-gradient(circle at 50% 46%, #000 30%, transparent 72%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 46%, rgba(255,90,31,.28), transparent 60%)' }}
        />
      </div>

      <div
        className="relative mx-auto w-full max-w-[640px] px-4 pb-8"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <IconButton
          label="Close"
          onClick={onClose}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
        />

        <div className="flex flex-col items-center text-center pt-6 pb-8">
          <div
            className="w-[88px] h-[88px] rounded-full bg-accent grid place-items-center"
            style={{ boxShadow: '0 10px 40px rgba(255,90,31,.45)' }}
            aria-hidden="true"
          >
            <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-fg mt-5">Workout logged!</h1>
          <p className="text-[15px] text-muted mt-1.5">
            {dateLabel} session done{streak > 0 && ` — ${streak}-day streak 🔥`}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-semibold text-fg">Workout summary</h2>
              {dayLabel && <TagPill icon={<span aria-hidden="true">🏋</span>}>{dayLabel}</TagPill>}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mt-4">
              <SummaryCell label="Exercises" value={`${exercises.length} / ${exercises.length}`} />
              {summary.parsedAll && <SummaryCell label="Sets finished" value={`${summary.sets} sets`} />}
              {summary.parsedAll && <SummaryCell label="Total reps" value={summary.reps.toLocaleString()} />}
              {summary.volume > 0 && (
                <SummaryCell label="Volume" value={`${Math.round(summary.volume).toLocaleString()} lb`} />
              )}
              {summary.top && (
                <SummaryCell label="Top weight" value={`${summary.top.weight} lb · ${summary.top.name}`} />
              )}
              {weekStats && (
                <SummaryCell label="This week" value={`${weekStats.completedCount} of ${weekStats.days.length} days`} />
              )}
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-2.5">
            <StatTile icon="🏋" label="Exercises" value={exercises.length} />
            <StatTile icon="🔥" label="Streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} />
            {latest != null && <StatTile icon="⚖️" label="Weight" value={`${latest.toFixed(1)} lb`} />}
          </div>

          {series.length > 1 && (
            <Card>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-[17px] font-semibold text-fg">Body weight</h2>
                {sinceFirst != null && (
                  <p className="text-[13px] text-muted">
                    {sinceFirst < 0 ? '−' : '+'}{Math.abs(sinceFirst).toFixed(1)} lb over 90 days
                  </p>
                )}
              </div>
              <AreaChart
                data={series}
                xKey="d"
                yKey="lb"
                showAxis={false}
                height={150}
                refLine={isFinite(target) ? { y: target, label: `Goal ${target}` } : undefined}
                className="mt-3"
              />
            </Card>
          )}
        </div>

        <Button full className="mt-6" onClick={onClose}>Done</Button>
      </div>
    </div>,
    document.body
  )
}
