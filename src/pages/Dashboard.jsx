import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import MacroRing from '../components/MacroRing'
import SkeletonLoader from '../components/SkeletonLoader'
import { useExpenses } from '../hooks/useExpenses'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useBudget } from '../hooks/useBudget'
import { formatCurrency } from '../lib/helpers'

export default function Dashboard() {
  const navigate = useNavigate()
  const { todayTotal, monthlyTotal, loading: expLoading } = useExpenses()
  const { todayCalories, todayProtein, todayCarbs, todayFat, loading: foodLoading } = useFoodLogs()
  const { discretionary, monthlyIncome, loading: budgetLoading } = useBudget()

  const loading = expLoading || foodLoading || budgetLoading
  const budgetLeft = discretionary - monthlyTotal

  return (
    <div className="page-container">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Good {getGreeting()}</h1>
        <p className="text-muted-foreground text-sm mt-1.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <SkeletonLoader count={4} height="h-28" />
      ) : (
        <>
          {/* Hero: Calories */}
          <div className="hero-card p-6 cursor-pointer active:scale-[0.98] transition-transform" onClick={() => navigate('/food')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="label text-[11px] font-semibold uppercase tracking-[0.1em]">Calories Today</p>
                <p className="text-[2.5rem] font-bold tracking-tight leading-none mt-2">{todayCalories.toLocaleString()}</p>
                <p className="label text-xs mt-2 flex items-center gap-1">
                  tap to log food
                  <Chevron />
                </p>
              </div>
              <div className="flex gap-4">
                <MacroRing label="Protein" value={todayProtein} max={150} color="protein" />
                <MacroRing label="Carbs" value={todayCarbs} max={250} color="carbs" />
                <MacroRing label="Fat" value={todayFat} max={65} color="fat" />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Card onClick={() => navigate('/finance')} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Spent Today</p>
                  <p className="stat-value mt-1.5">{formatCurrency(todayTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">this month: {formatCurrency(monthlyTotal)}</p>
                </div>
                <Chevron />
              </div>
            </Card>

            <Card onClick={() => navigate('/budget')} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Budget Left</p>
                  <p className={`stat-value mt-1.5 ${budgetLeft < 0 ? 'text-destructive' : 'text-emerald-500'}`}>
                    {formatCurrency(budgetLeft)}
                  </p>
                  {monthlyIncome > 0 ? (
                    <div className="mt-2.5 h-1.5 w-32 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(0, Math.min(100, (1 - monthlyTotal / discretionary) * 100))}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1.5">set up your budget</p>
                  )}
                </div>
                <Chevron />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <p className="stat-label mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="action-card p-5 text-left group" onClick={() => navigate('/food')}>
                <span className="text-2xl block">🍽️</span>
                <p className="text-sm font-semibold mt-3 text-foreground group-hover:text-primary transition-colors">Log Food</p>
                <p className="text-xs text-muted-foreground mt-0.5">Track a meal</p>
              </div>
              <div className="action-card p-5 text-left group" onClick={() => navigate('/finance')}>
                <span className="text-2xl block">💸</span>
                <p className="text-sm font-semibold mt-3 text-foreground group-hover:text-primary transition-colors">Log Expense</p>
                <p className="text-xs text-muted-foreground mt-0.5">Add a purchase</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Chevron() {
  return (
    <svg className="card-chevron w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
