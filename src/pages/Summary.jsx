import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import MonthPicker from '../components/MonthPicker'
import SpendingChart from '../components/SpendingChart'
import SkeletonLoader from '../components/SkeletonLoader'
import { useExpenses } from '../hooks/useExpenses'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useGoals } from '../hooks/useGoals'
import { useBudget } from '../hooks/useBudget'
import { useWeightLogs } from '../hooks/useWeightLogs'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import { filterByMonth } from '../lib/dateFilters'
import { exportExpensesCSV, exportFoodLogsCSV } from '../lib/csvExport'
import { formatCurrency } from '../lib/helpers'
import { parseDateLocal } from '../lib/bodyAnalysis'

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

export default function Summary() {
  const navigate = useNavigate()
  const { expenses, loading: expLoading } = useExpenses()
  const { logs, loading: foodLoading } = useFoodLogs()
  const { bodyGoal, financialGoal, loading: goalLoading } = useGoals()
  const { discretionary, loading: budgetLoading } = useBudget()
  const { logs: weightLogs, computePace, staleDays, loading: weightLoading } = useWeightLogs()
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
  const monthWeights = useMemo(
    () => filterByMonth(weightLogs, selectedMonth.year, selectedMonth.month, 'date'),
    [weightLogs, selectedMonth.year, selectedMonth.month]
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

  const pace = useMemo(
    () => computePace({ target_weight: bodyData?.target_weight, target_date: bodyGoal?.target_date }),
    [computePace, bodyData, bodyGoal]
  )

  // Week-over-week weight delta (last 7 days avg vs prior 7 days avg).
  const weekWeightDelta = useMemo(() => computeWeekWeightDelta(weightLogs), [weightLogs])

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
      {(bodyData || finData) && (
        <section>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Goals</h2>
          <div className="summary-goal-grid">
            {bodyData && (
              <BodyGoalProgressCard
                bodyData={bodyData}
                targetDate={bodyGoal.target_date}
                weightLogs={weightLogs}
                monthWeights={monthWeights}
                pace={pace}
                weekWeightDelta={weekWeightDelta}
                staleDays={staleDays}
                onOpen={() => navigate('/body-goals')}
              />
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

/* ─── Body goal card with sparkline, pace dot, week delta, stale nudge ─── */
function BodyGoalProgressCard({ bodyData, targetDate, weightLogs, monthWeights, pace, weekWeightDelta, staleDays, onOpen }) {
  const currentWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : Number(bodyData.current_weight) || null
  const targetWeight = Number(bodyData.target_weight) || null
  const status = pace?.status || 'unknown'
  const showStale = staleDays != null && staleDays >= 3

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open Body Goals"
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
              width: 10, height: 10, borderRadius: '50%',
              background: STATUS_COLOR[status], boxShadow: `0 0 0 4px ${STATUS_SOFT[status]}`,
              flexShrink: 0,
            }}
          />
          <p className="stat-label" style={{ margin: 0 }}>Body Goal Progress</p>
        </div>
        <svg className="card-chevron w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>

      {/* Weight summary */}
      <div className="flex items-baseline" style={{ gap: 10, marginBottom: 12 }}>
        <span className="text-foreground" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>
          {currentWeight != null ? `${Number(currentWeight).toFixed(1)}` : '—'}
        </span>
        {currentWeight != null && <span className="text-muted-foreground" style={{ fontSize: 12 }}>lbs</span>}
        {targetWeight && <span className="text-muted-foreground" style={{ fontSize: 12, marginLeft: 'auto' }}>goal {targetWeight} lbs</span>}
      </div>

      {/* Sparkline */}
      <Sparkline points={monthWeights.map(w => Number(w.weight))} targetWeight={targetWeight} />

      {/* Week delta + pace label */}
      <div className="flex items-center justify-between" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
        {weekWeightDelta != null ? (
          <span
            style={{
              fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: 999,
              background: weekWeightDelta < 0 ? 'var(--success-soft)' : weekWeightDelta > 0 ? 'var(--warning-soft)' : 'var(--muted)',
              color: weekWeightDelta < 0 ? 'var(--success)' : weekWeightDelta > 0 ? 'var(--warning)' : 'var(--muted-foreground)',
              whiteSpace: 'nowrap',
            }}
          >
            {weekWeightDelta > 0 ? '+' : ''}{weekWeightDelta.toFixed(1)} lbs vs last wk
          </span>
        ) : (
          <span className="text-muted-foreground" style={{ fontSize: 11 }}>Log weekly to see changes</span>
        )}
        <span className="text-muted-foreground" style={{ fontSize: 11, textAlign: 'right', flex: 1, minWidth: 0 }}>
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
          Target by {new Date(targetDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
    </button>
  )
}

function Sparkline({ points, targetWeight }) {
  if (!points || points.length < 2) {
    return <div style={{ height: 36, fontSize: 11, color: 'var(--muted-foreground)' }}>Log two or more entries this month for a trend</div>
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
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      {targetY != null && (
        <line x1={0} x2={width} y1={targetY} y2={targetY} stroke="var(--warning)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
      )}
      <path d={d} fill="none" stroke="var(--goal-body)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={i * step} cy={y(v)} r={i === points.length - 1 ? 3 : 1.5} fill="var(--goal-body)" />
      ))}
    </svg>
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
