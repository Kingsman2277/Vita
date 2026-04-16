import { useMemo } from 'react'
import Card from '../components/Card'
import MonthPicker from '../components/MonthPicker'
import SpendingChart from '../components/SpendingChart'
import SkeletonLoader from '../components/SkeletonLoader'
import BodyGoalProgressCard from '../components/BodyGoalProgressCard'
import { useExpenses } from '../hooks/useExpenses'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useGoals } from '../hooks/useGoals'
import { useBudget } from '../hooks/useBudget'
import { useWeightLogs } from '../hooks/useWeightLogs'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import { filterByMonth } from '../lib/dateFilters'
import { exportExpensesCSV, exportFoodLogsCSV } from '../lib/csvExport'
import { formatCurrency } from '../lib/helpers'

export default function Summary() {
  const { expenses, loading: expLoading } = useExpenses()
  const { logs, loading: foodLoading } = useFoodLogs()
  const { bodyGoal, financialGoal, loading: goalLoading } = useGoals()
  const { discretionary, loading: budgetLoading } = useBudget()
  const { logs: weightLogs, loading: weightLoading } = useWeightLogs()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const loading = expLoading || foodLoading || goalLoading || budgetLoading || weightLoading

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
    <div className="page-container">
      <header>
        <h1 className="page-title">Monthly Summary</h1>
      </header>

      <MonthPicker label={label} onPrev={goToPrev} onNext={goToNext} onToday={goToCurrentMonth} isCurrentMonth={isCurrentMonth} />

      {/* Spending — hero card */}
      <section className="hero-card">
        <p className="label stat-label">Spending Breakdown</p>
        <p
          style={{
            fontSize: 'clamp(34px, 9vw, 44px)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1,
            marginTop: 12,
          }}
        >
          {formatCurrency(monthTotal)}
        </p>
        <div style={{ marginTop: 24 }}>
          <SpendingChart expenses={monthExpenses} />
        </div>
      </section>

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
                <button
                  onClick={() => exportExpensesCSV(monthExpenses, label)}
                  className="btn-secondary"
                  style={{ minWidth: 'auto', padding: '10px 18px', fontSize: 13 }}
                >
                  📊 Export Expenses ({monthExpenses.length})
                </button>
              )}
              {monthLogs.length > 0 && (
                <button
                  onClick={() => exportFoodLogsCSV(monthLogs, label)}
                  className="btn-secondary"
                  style={{ minWidth: 'auto', padding: '10px 18px', fontSize: 13 }}
                >
                  🥗 Export Food Log ({monthLogs.length})
                </button>
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

