import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AppHeader, AreaChart, Card, EmptyState, IconButton, ProgressRing,
  SectionHeader, SegmentedControl, Skeleton, StatTile, TagPill, WeekRow,
} from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useFeatures } from '../hooks/useFeatures'
import { useExpenses } from '../hooks/useExpenses'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useBudget } from '../hooks/useBudget'
import { useWorkoutLogs } from '../hooks/useWorkoutLogs'
import { useWeightLogs } from '../hooks/useWeightLogs'
import { useGoals } from '../hooks/useGoals'
import { formatCurrency } from '../lib/helpers'

// "SATURDAY, 31 OCTOBER" — the mockup's caption. Built from parts because
// no single locale gives weekday-comma-day-month in that order.
function longCaption(date) {
  const weekday = date.toLocaleDateString('en-CA', { weekday: 'long' })
  const day = date.getDate()
  const month = date.toLocaleDateString('en-CA', { month: 'long' })
  return `${weekday}, ${day} ${month}`.toUpperCase()
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function MoneyCard({ onClick }) {
  const { monthlyTotal } = useExpenses()
  const { discretionary } = useBudget()

  if (!(discretionary > 0)) {
    return (
      <Card onClick={onClick}>
        <p className="text-xs font-medium text-muted">Discretionary left</p>
        <p className="text-[17px] font-semibold text-fg mt-1">Set up your budget</p>
        <p className="text-xs text-muted mt-1">Add your income and savings to track what's left.</p>
      </Card>
    )
  }

  const left = discretionary - monthlyTotal
  const leftRatio = left / discretionary

  // "On track" compares how much budget is left against how much of the
  // month is left: ahead of the calendar is on track, behind it is not.
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthRemaining = (daysInMonth - now.getDate() + 1) / daysInMonth
  const over = left < 0
  const onTrack = leftRatio >= monthRemaining

  return (
    <Card onClick={onClick} aria-label={`Discretionary left: ${formatCurrency(left)}. Tap for details.`}>
      <div className="flex items-center gap-4">
        <ProgressRing
          value={Math.max(0, leftRatio)}
          label={`${Math.max(0, Math.round(leftRatio * 100))}%`}
          sub="left"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted truncate">
              Discretionary left · {now.toLocaleDateString('en-CA', { month: 'short' })}
            </p>
            <TagPill tone={onTrack && !over ? 'accent' : 'neutral'}>
              {over ? 'Over' : onTrack ? 'On track' : 'Behind'}
            </TagPill>
          </div>
          <p className={`text-[28px] font-bold tracking-[-0.02em] tabular-nums leading-tight mt-1 ${over ? 'text-danger' : 'text-fg'}`}>
            {formatCurrency(left)}
          </p>
          <p className="text-[13px] text-muted mt-0.5">
            {formatCurrency(monthlyTotal)} spent of {formatCurrency(discretionary)}
          </p>
        </div>
      </div>
    </Card>
  )
}

function WeightCard({ onViewAll }) {
  const { logs } = useWeightLogs()
  const { bodyGoal } = useGoals()

  const series = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 60)
    return logs
      .filter(l => new Date(`${l.date}T00:00:00`) >= cutoff)
      .map(l => ({ d: l.date.slice(5), lb: Number(l.weight) }))
      .filter(p => isFinite(p.lb))
  }, [logs])

  if (series.length === 0) {
    return (
      <Card>
        <SectionHeader title="Weight trend" />
        <EmptyState
          icon="⚖️"
          title="No weights logged"
          desc="Log a weight from the + button to start a trend."
        />
      </Card>
    )
  }

  const target = Number(bodyGoal?.target_weight)
  const latest = series[series.length - 1].lb

  // Slope over the window, expressed per week — enough for a one-line
  // summary without pulling in the full pace model.
  let perWeek = null
  if (series.length >= 2) {
    const first = series[0].lb
    const days = Math.max(1, (logs.length && series.length) ? series.length - 1 : 1)
    perWeek = ((latest - first) / days) * 7
  }

  const parts = [`${latest.toFixed(1)} lb`]
  if (perWeek != null && isFinite(perWeek)) {
    parts.push(`${perWeek < 0 ? '−' : '+'}${Math.abs(perWeek).toFixed(1)} lb/wk`)
  }
  if (isFinite(target)) parts.push(`on pace for ${target}`)

  return (
    <Card>
      <SectionHeader title="Weight trend" action={onViewAll && { label: 'View all', onClick: onViewAll }} />
      <p className="text-[13px] text-muted mt-1">{parts.join(' · ')}</p>
      <AreaChart
        data={series}
        xKey="d"
        yKey="lb"
        showAxis={false}
        height={140}
        refLine={isFinite(target) ? { y: target } : undefined}
        className="mt-3"
      />
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { username } = useAuth()
  const { hasFeature, loading: featuresLoading } = useFeatures()
  const [range, setRange] = useState('today')

  const { expenses, todayTotal, loading: expLoading } = useExpenses()
  const { logs: foodLogs, todayCalories, todayProtein, todayCarbs, todayFat, loading: foodLoading } = useFoodLogs()
  const { loading: budgetLoading } = useBudget()
  const { streak, weekRow, completedCount, totalCount, loading: workoutLoading } = useWorkoutLogs()

  const showMoney = hasFeature('finance') || hasFeature('budget')
  const showFood = hasFeature('food')
  const showWorkout = hasFeature('workout')
  const showWeight = hasFeature('goals')

  // Seven-day aggregates for the Weekly segment. Both hooks already hold
  // the full rows, so this needs no extra queries.
  const weekly = useMemo(() => {
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - 6)

    const spend = expenses
      .filter(e => new Date(`${e.date}T00:00:00`) >= cutoff)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0)

    const byDay = new Map()
    for (const log of foodLogs) {
      const d = new Date(log.logged_at)
      if (d < cutoff) continue
      const key = d.toDateString()
      byDay.set(key, (byDay.get(key) || 0) + Number(log.calories || 0))
    }
    const avgCalories = byDay.size ? Math.round([...byDay.values()].reduce((a, b) => a + b, 0) / byDay.size) : 0

    const sessions = weekRow.filter(d => d.state === 'done').length
    const scheduled = weekRow.filter(d => d.state !== 'rest').length

    return { spend, avgCalories, loggedDays: byDay.size, sessions, scheduled }
  }, [expenses, foodLogs, weekRow])

  const loading = featuresLoading || expLoading || foodLoading || budgetLoading || workoutLoading

  const todayExpenseCount = expenses.filter(e => {
    const d = new Date(`${e.date}T00:00:00`)
    const n = new Date()
    return d.toDateString() === n.toDateString()
  }).length

  const isWeekly = range === 'weekly'

  return (
    <div
      className="mx-auto w-full max-w-[640px] px-4 pb-6 flex flex-col gap-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
    >
      <AppHeader
        avatarInitial={username?.charAt(0) || '?'}
        caption={longCaption(new Date())}
        title={`Hi, ${username ? username.charAt(0).toUpperCase() + username.slice(1) : 'there'}`}
        right={<IconButton label="Open settings" icon={<SettingsIcon />} onClick={() => navigate('/me')} />}
      />

      <SegmentedControl
        value={range}
        onChange={setRange}
        options={[{ value: 'today', label: 'Today' }, { value: 'weekly', label: 'Weekly' }]}
      />

      {loading ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton height={64} radius={18} />
          <Skeleton height={120} radius={18} />
          <Skeleton height={92} radius={18} />
          <Skeleton height={200} radius={18} />
        </div>
      ) : (
        <>
          {showWorkout && weekRow.length > 0 && (
            <WeekRow days={weekRow} onSelect={() => navigate('/body/training')} />
          )}

          {showMoney && <MoneyCard onClick={() => navigate('/money/expenses')} />}

          <div className="grid grid-cols-3 gap-2.5">
            {showMoney && (
              <StatTile
                icon="💳"
                label={isWeekly ? 'Spent · 7d' : 'Spent today'}
                value={formatCurrency(isWeekly ? weekly.spend : todayTotal)}
                sub={isWeekly ? 'last 7 days' : `${todayExpenseCount} ${todayExpenseCount === 1 ? 'expense' : 'expenses'}`}
                onClick={() => navigate('/money/expenses')}
              />
            )}
            {showFood && (
              <StatTile
                icon="🔥"
                label={isWeekly ? 'Avg calories' : 'Calories'}
                value={(isWeekly ? weekly.avgCalories : todayCalories).toLocaleString()}
                sub={isWeekly
                  ? `${weekly.loggedDays} ${weekly.loggedDays === 1 ? 'day' : 'days'} logged`
                  : `P${todayProtein}·C${todayCarbs}·F${todayFat}`}
                onClick={() => navigate('/body/food')}
              />
            )}
            {showWorkout && (
              <StatTile
                icon="💪"
                label={isWeekly ? 'Sessions' : 'Streak'}
                value={isWeekly ? `${weekly.sessions}/${weekly.scheduled}` : `${streak} ${streak === 1 ? 'day' : 'days'}`}
                sub={isWeekly ? 'this week' : totalCount === 0 ? 'Rest day' : `${completedCount}/${totalCount} done`}
                onClick={() => navigate('/body/training')}
              />
            )}
          </div>

          {showWeight && <WeightCard onViewAll={() => navigate('/body/progress')} />}
        </>
      )}
    </div>
  )
}
