import { useMemo } from 'react'
import Card from '../components/Card'
import MonthPicker from '../components/MonthPicker'
import SpendingChart from '../components/SpendingChart'
import SkeletonLoader from '../components/SkeletonLoader'
import { useExpenses } from '../hooks/useExpenses'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useGoals } from '../hooks/useGoals'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import { filterByMonth } from '../lib/dateFilters'
import { exportExpensesCSV, exportFoodLogsCSV } from '../lib/csvExport'
import { formatCurrency } from '../lib/helpers'

export default function Summary() {
  const { expenses, loading: expLoading } = useExpenses()
  const { logs, loading: foodLoading } = useFoodLogs()
  const { bodyGoal, financialGoal, loading: goalLoading } = useGoals()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const loading = expLoading || foodLoading || goalLoading

  const monthExpenses = useMemo(
    () => filterByMonth(expenses, selectedMonth.year, selectedMonth.month, 'date'),
    [expenses, selectedMonth.year, selectedMonth.month]
  )
  const monthLogs = useMemo(
    () => filterByMonth(logs, selectedMonth.year, selectedMonth.month, 'logged_at'),
    [logs, selectedMonth.year, selectedMonth.month]
  )

  const stats = useMemo(() => {
    const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const daysWithLogs = new Set(monthLogs.map(l => new Date(l.logged_at).toDateString())).size
    const totalCalories = monthLogs.reduce((sum, l) => sum + Number(l.calories || 0), 0)
    const avgCalories = daysWithLogs > 0 ? Math.round(totalCalories / daysWithLogs) : 0
    return { monthTotal, daysWithLogs, totalCalories, avgCalories }
  }, [monthExpenses, monthLogs])
  const { monthTotal, daysWithLogs, avgCalories } = stats

  const bodyData = bodyGoal?.data
  const finData = financialGoal?.data

  if (loading) return <div className="page-container"><SkeletonLoader count={5} height="h-36" /></div>

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Monthly Summary</h1>
      </div>

      <MonthPicker label={label} onPrev={goToPrev} onNext={goToNext} onToday={goToCurrentMonth} isCurrentMonth={isCurrentMonth} />

      {/* Spending — hero card */}
      <div className="hero-card">
        <p className="label stat-label">Spending Breakdown</p>
        <p style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 14 }}>{formatCurrency(monthTotal)}</p>
        <div style={{ marginTop: 26 }}><SpendingChart expenses={monthExpenses} /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <Card>
          <p className="stat-label">Avg Daily Calories</p>
          <p className="stat-value" style={{ marginTop: 12 }}>{avgCalories.toLocaleString()}</p>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 8 }}>{daysWithLogs} day{daysWithLogs !== 1 ? 's' : ''} logged</p>
        </Card>
        <Card>
          <p className="stat-label">Total Expenses</p>
          <p className="stat-value" style={{ marginTop: 12 }}>{monthExpenses.length}</p>
          <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 8 }}>transactions</p>
        </Card>
      </div>

      {bodyData && (
        <Card>
          <p className="stat-label" style={{ marginBottom: 14 }}>Body Goal Progress</p>
          <div className="flex justify-between text-sm" style={{ marginBottom: 10 }}>
            <span className="text-muted-foreground">Current: <span className="text-foreground font-medium">{bodyData.current_weight} lbs</span></span>
            <span className="text-muted-foreground">Target: <span className="text-primary font-medium">{bodyData.target_weight} lbs</span></span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${Math.max(5, Math.min(95, bodyData.current_weight <= bodyData.target_weight ? 100 : ((bodyData.current_weight - bodyData.target_weight) / bodyData.current_weight) * 100))}%` }} />
          </div>
          {bodyGoal.target_date && <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 12 }}>Target: {new Date(bodyGoal.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
        </Card>
      )}

      {finData && (
        <Card>
          <p className="stat-label" style={{ marginBottom: 14 }}>Financial Goal</p>
          <p className="text-sm text-foreground">Save <span className="font-bold text-primary">{formatCurrency(finData.savings_target)}</span> in {finData.timeline_months} months</p>
          <p className="text-muted-foreground" style={{ fontSize: 12, marginTop: 6 }}>{formatCurrency(finData.savings_target / finData.timeline_months)}/month needed</p>
        </Card>
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
        <Card>
          <p className="stat-label mb-3">Export Data</p>
          <p className="text-xs text-muted-foreground mb-4">Download {label} data as CSV files</p>
          <div className="flex gap-3 flex-wrap">
            {monthExpenses.length > 0 && (
              <button onClick={() => exportExpensesCSV(monthExpenses, label)} className="btn-secondary" style={{ minWidth: 'auto', padding: '10px 18px', fontSize: 13 }}>
                📊 Export Expenses ({monthExpenses.length})
              </button>
            )}
            {monthLogs.length > 0 && (
              <button onClick={() => exportFoodLogsCSV(monthLogs, label)} className="btn-secondary" style={{ minWidth: 'auto', padding: '10px 18px', fontSize: 13 }}>
                🥗 Export Food Log ({monthLogs.length})
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
