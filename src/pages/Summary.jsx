import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import { AppHeader, Button, MonthPill, ProgressBar, StatTile } from '../components/ui'
import SkeletonLoader from '../components/SkeletonLoader'
import BodyGoalProgressCard from '../components/BodyGoalProgressCard'
import { useExpenses } from '../hooks/useExpenses'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useGoals } from '../hooks/useGoals'
import { useBudget } from '../hooks/useBudget'
import { useWeightLogs } from '../hooks/useWeightLogs'
import { useWorkoutLogs } from '../hooks/useWorkoutLogs'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import { filterByMonth } from '../lib/dateFilters'
import { exportExpensesCSV, exportFoodLogsCSV } from '../lib/csvExport'
import { formatCurrency, getCategoryEmoji, EXPENSE_CATEGORIES } from '../lib/helpers'

export default function Summary() {
  const navigate = useNavigate()
  const { expenses, loading: expLoading } = useExpenses()
  const { logs, loading: foodLoading } = useFoodLogs()
  const { bodyGoal, financialGoal, loading: goalLoading } = useGoals()
  const { discretionary, loading: budgetLoading } = useBudget()
  const { logs: weightLogs, loading: weightLoading } = useWeightLogs()
  const { streak: workoutStreak, monthStats: workoutMonthStats, loading: workoutLoading } = useWorkoutLogs()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const loading = expLoading || foodLoading || goalLoading || budgetLoading || weightLoading || workoutLoading

  const monthExpenses = useMemo(
    () => filterByMonth(expenses, selectedMonth.year, selectedMonth.month, 'date'),
    [expenses, selectedMonth.year, selectedMonth.month]
  )
  const monthLogs = useMemo(
    () => filterByMonth(logs, selectedMonth.year, selectedMonth.month, 'logged_at'),
    [logs, selectedMonth.year, selectedMonth.month]
  )
  const stats = useMemo(() => {
    const monthTotal = monthExpenses
      .filter(e => !e.is_recurring)
      .reduce((sum, e) => sum + Number(e.amount), 0)
    const daysWithLogs = new Set(monthLogs.map(l => new Date(l.logged_at).toDateString())).size
    const totalCalories = monthLogs.reduce((sum, l) => sum + Number(l.calories || 0), 0)
    const avgCalories = daysWithLogs > 0 ? Math.round(totalCalories / daysWithLogs) : 0
    return { monthTotal, daysWithLogs, totalCalories, avgCalories }
  }, [monthExpenses, monthLogs])
  const { monthTotal, daysWithLogs, avgCalories } = stats

  // Trend: this week vs last week avg daily calories (based on logged days, not elapsed days).
  const calorieTrend = useMemo(() => computeCalorieTrend(logs), [logs])

  const bodyData = bodyGoal?.data
  const finData = financialGoal?.data
  const hasBodyCard = !!bodyData || weightLogs.length > 0

  // Is the user over their monthly discretionary budget?
  const overBudget = discretionary > 0 && monthTotal > discretionary
  const pctOfBudget = discretionary > 0 ? (monthTotal / discretionary) * 100 : 0

  if (loading) return <div className="page-container"><SkeletonLoader count={5} height="h-36" /></div>

  return (
    <div
      className="mx-auto w-full max-w-[640px] px-4 pb-6 flex flex-col gap-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <AppHeader
        title="Insights"
        right={
          <MonthPill
            label={label}
            isCurrentMonth={isCurrentMonth}
            onPrev={goToPrev}
            onNext={goToNext}
            onToday={goToCurrentMonth}
          />
        }
      />

      {/* Spending — bars rather than the old multi-colour donut, so the
          breakdown reads in one orange ramp (§4.1, §6.5). */}
      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Spending breakdown</p>
        <p className="text-[34px] font-bold tracking-[-0.02em] text-fg tabular-nums leading-none mt-2">
          {formatCurrency(monthTotal)}
        </p>
        {/* Same predicate as monthTotal above — including reimbursable
            rows here made the percentages add up to 158%. */}
        <CategoryBreakdown expenses={monthExpenses.filter(e => !e.is_recurring)} total={monthTotal} />
      </Card>

      {/* At-a-glance stats */}
      <section className="summary-stat-grid">
        <Card>
          <p className="stat-label">Avg Daily Calories</p>
          <p className="stat-value" style={{ marginTop: 10 }}>{avgCalories.toLocaleString()}</p>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 6 }}>
            {daysWithLogs} day{daysWithLogs !== 1 ? 's' : ''} logged
          </p>
          {calorieTrend && (
            <p style={{ fontSize: 12, marginTop: 8, color: calorieTrend.color, fontWeight: 500 }}>
              {calorieTrend.arrow} {Math.abs(calorieTrend.delta).toLocaleString()} cal/day vs last week
            </p>
          )}
        </Card>
        <Card>
          <p className="stat-label">Total Expenses</p>
          <p className="stat-value" style={{ marginTop: 10 }}>{monthExpenses.length}</p>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 6 }}>transactions</p>
          {discretionary > 0 && (
            <p style={{ fontSize: 12, marginTop: 8, color: overBudget ? 'var(--danger)' : 'var(--muted-foreground)', fontWeight: overBudget ? 600 : 400 }}>
              {overBudget
                ? `⚠️ Over budget — ${formatCurrency(monthTotal - discretionary)} past ${formatCurrency(discretionary)}`
                : `${pctOfBudget.toFixed(0)}% of ${formatCurrency(discretionary)} discretionary`}
            </p>
          )}
        </Card>
      </section>

      {/* Workout */}
      <WorkoutSummaryCard
        streak={workoutStreak}
        monthStats={workoutMonthStats(selectedMonth.year, selectedMonth.month)}
        onOpen={() => navigate('/workout')}
      />

      {/* Goals */}
      {(hasBodyCard || finData) && (
        <section>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Goals</h2>
          <div className="summary-goal-grid">
            {hasBodyCard && (
              <BodyGoalProgressCard anchorMonth={selectedMonth} />
            )}

            {finData && (
              <Card>
                <p className="stat-label" style={{ marginBottom: 14 }}>Financial Goal</p>
                <p className="text-sm text-foreground" style={{ lineHeight: 1.5 }}>
                  Save <span className="font-bold text-primary">{formatCurrency(finData.savings_target)}</span> in {finData.timeline_months} month{finData.timeline_months !== 1 ? 's' : ''}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 8 }}>
                  {formatCurrency(finData.savings_target / finData.timeline_months)}/month needed
                </p>
              </Card>
            )}
          </div>
        </section>
      )}

      {!bodyData && !finData && (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <p className="empty-state-title">No goals set yet</p>
          <p className="empty-state-desc">Set body and financial goals to track your progress here</p>
        </div>
      )}

      {/* Export section */}
      {(monthExpenses.length > 0 || monthLogs.length > 0) && (
        <section>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Export Data</h2>
          <Card>
            <p className="text-muted-foreground" style={{ fontSize: 13, marginBottom: 16 }}>
              Download {label} data as CSV files
            </p>
            <div className="flex flex-wrap" style={{ gap: 10 }}>
              {monthExpenses.length > 0 && (
                <Button variant="secondary" size="md" onClick={() => exportExpensesCSV(monthExpenses, label)}>
                  📊 Export expenses ({monthExpenses.length})
                </Button>
              )}
              {monthLogs.length > 0 && (
                <Button variant="secondary" size="md" onClick={() => exportFoodLogsCSV(monthLogs, label)}>
                  🥗 Export food log ({monthLogs.length})
                </Button>
              )}
            </div>
          </Card>
        </section>
      )}
    </div>
  )
}

/* ─── Pure helpers for Summary ─── */
function computeCalorieTrend(foodLogs) {
  if (!foodLogs || foodLogs.length === 0) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  // Aggregate calories per local day.
  const byDay = new Map()
  for (const l of foodLogs) {
    if (!l.logged_at) continue
    const d = new Date(l.logged_at)
    d.setHours(0, 0, 0, 0)
    const key = d.toDateString()
    byDay.set(key, (byDay.get(key) || 0) + Number(l.calories || 0))
  }
  const day = (offset) => {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    return d.toDateString()
  }
  const avgRange = (from, to) => {
    const totals = []
    for (let i = from; i <= to; i++) {
      const v = byDay.get(day(i))
      if (v != null) totals.push(v)
    }
    return totals.length === 0 ? null : totals.reduce((a, b) => a + b, 0) / totals.length
  }
  const thisWeek = avgRange(0, 6)
  const lastWeek = avgRange(7, 13)
  if (thisWeek == null || lastWeek == null) return null
  const delta = Math.round(thisWeek - lastWeek)
  if (Math.abs(delta) < 20) {
    return { delta, arrow: '→', color: 'var(--muted-foreground)' }
  }
  return {
    delta,
    arrow: delta > 0 ? '↑' : '↓',
    color: delta > 0 ? 'var(--warning)' : 'var(--success)',
  }
}

/* ─── Workout summary card ─── */
const MUSCLE_LABEL = {
  cardio: '🔥 Cardio',
  legs: '🦵 Legs',
  push: '💪 Push',
  pull: '🤸 Pull',
  arms: '💪 Arms',
}

function WorkoutSummaryCard({ streak, monthStats, onOpen }) {
  const { workoutsCompleted, exercisesCompleted, topMuscleGroup, activeDays } = monthStats
  // Hide the card entirely if no workouts have ever been logged.
  if (activeDays === 0 && streak === 0) return null

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open Workout"
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
      <div className="flex items-center justify-between" style={{ marginBottom: 14, gap: 12 }}>
        <p className="stat-label" style={{ margin: 0 }}>Workout</p>
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

      <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 12 }}>
        <div>
          <p className="text-foreground" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {workoutsCompleted}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 6 }}>workouts done</p>
        </div>
        <div>
          <p className="text-foreground" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {exercisesCompleted}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 6 }}>exercises</p>
        </div>
        <div>
          <p className="text-foreground" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            🔥 {streak}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 11, marginTop: 6 }}>day streak</p>
        </div>
      </div>

      {topMuscleGroup && (
        <p className="text-muted-foreground" style={{ fontSize: 12 }}>
          Most trained: <span className="text-foreground" style={{ fontWeight: 600 }}>{MUSCLE_LABEL[topMuscleGroup] || topMuscleGroup}</span>
        </p>
      )}
    </button>
  )
}

/**
 * Per-category spend as horizontal bars in one orange ramp. Replaces the
 * old six-colour donut: the palette keeps module colours out of charts
 * (§4.1), and bars carry the figures without a legend.
 */
function CategoryBreakdown({ expenses, total }) {
  const rows = useMemo(() => {
    const byCategory = new Map()
    for (const e of expenses) {
      const key = e.category || 'other'
      byCategory.set(key, (byCategory.get(key) || 0) + Number(e.amount || 0))
    }
    return [...byCategory.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        label: EXPENSE_CATEGORIES.find(c => c.value === category)?.label || category,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  if (rows.length === 0) {
    return <p className="text-[13px] text-muted mt-3">No expenses this month.</p>
  }

  return (
    <div className="flex flex-col gap-3 mt-4">
      {rows.map(row => (
        <div key={row.category}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] text-fg truncate">
              <span aria-hidden="true">{getCategoryEmoji(row.category)}</span> {row.label}
            </p>
            <p className="text-[14px] font-semibold text-fg tabular-nums shrink-0">
              {formatCurrency(row.amount)}
              <span className="text-muted font-normal"> · {total > 0 ? Math.round((row.amount / total) * 100) : 0}%</span>
            </p>
          </div>
          <ProgressBar value={row.amount} max={total || 1} className="mt-1.5" />
        </div>
      ))}
    </div>
  )
}
