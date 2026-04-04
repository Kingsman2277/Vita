import Card from '../components/Card'
import SpendingChart from '../components/SpendingChart'
import SkeletonLoader from '../components/SkeletonLoader'
import { useExpenses } from '../hooks/useExpenses'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useGoals } from '../hooks/useGoals'
import { formatCurrency } from '../lib/helpers'

export default function Summary() {
  const { expenses, monthlyTotal, loading: expLoading } = useExpenses()
  const { logs, loading: foodLoading } = useFoodLogs()
  const { bodyGoal, financialGoal, loading: goalLoading } = useGoals()
  const loading = expLoading || foodLoading || goalLoading

  const now = new Date()
  const monthExpenses = expenses.filter(e => { const d = new Date(e.date + 'T00:00:00'); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const monthLogs = logs.filter(l => { const d = new Date(l.logged_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })
  const daysWithLogs = new Set(monthLogs.map(l => new Date(l.logged_at).toDateString())).size
  const totalCalories = monthLogs.reduce((sum, l) => sum + Number(l.calories || 0), 0)
  const avgCalories = daysWithLogs > 0 ? Math.round(totalCalories / daysWithLogs) : 0
  const bodyData = bodyGoal?.data
  const finData = financialGoal?.data

  if (loading) return <div className="page-container"><SkeletonLoader count={5} height="h-36" /></div>

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Monthly Summary</h1>
        <p className="text-muted-foreground text-sm mt-1">{now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* Spending — hero card */}
      <div className="hero-card" style={{ padding: '28px 24px' }}>
        <p className="label text-[11px] font-semibold uppercase tracking-[0.1em]">Spending Breakdown</p>
        <p className="text-[2.5rem] font-bold tracking-tight leading-none mt-2">{formatCurrency(monthlyTotal)}</p>
        <div style={{ margin: '24px auto 0' }}><SpendingChart expenses={monthExpenses} /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <Card className="p-5">
          <p className="stat-label">Avg Daily Calories</p>
          <p className="stat-value mt-1.5">{avgCalories.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1.5">{daysWithLogs} day{daysWithLogs !== 1 ? 's' : ''} logged</p>
        </Card>
        <Card className="p-5">
          <p className="stat-label">Total Expenses</p>
          <p className="stat-value mt-1.5">{monthExpenses.length}</p>
          <p className="text-xs text-muted-foreground mt-1.5">transactions this month</p>
        </Card>
      </div>

      {bodyData && (
        <Card className="p-5">
          <p className="stat-label mb-3">Body Goal Progress</p>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Current: <span className="text-foreground font-medium">{bodyData.current_weight} lbs</span></span>
            <span className="text-muted-foreground">Target: <span className="text-primary font-medium">{bodyData.target_weight} lbs</span></span>
          </div>
          <div className="bg-muted rounded-full overflow-hidden" style={{ height: 6, borderRadius: 3 }}>
            <div className="h-full bg-primary transition-all duration-500" style={{ borderRadius: 3, width: `${Math.max(5, Math.min(95, bodyData.current_weight <= bodyData.target_weight ? 100 : ((bodyData.current_weight - bodyData.target_weight) / bodyData.current_weight) * 100))}%` }} />
          </div>
          {bodyGoal.target_date && <p className="text-xs text-muted-foreground mt-2">Target: {new Date(bodyGoal.target_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>}
        </Card>
      )}

      {finData && (
        <Card className="p-5">
          <p className="stat-label mb-3">Financial Goal</p>
          <p className="text-sm text-foreground">Save <span className="font-bold text-primary">{formatCurrency(finData.savings_target)}</span> in {finData.timeline_months} months</p>
          <p className="text-xs text-muted-foreground mt-1">{formatCurrency(finData.savings_target / finData.timeline_months)}/month needed</p>
        </Card>
      )}

      {!bodyData && !finData && (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <p className="empty-state-title">No goals set yet</p>
          <p className="empty-state-desc">Set body and financial goals to track your progress here</p>
        </div>
      )}
    </div>
  )
}
