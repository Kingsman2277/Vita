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
      <div>
        <h1 className="page-title">Good {getGreeting()}</h1>
        <p className="text-muted-foreground mt-1.5" style={{ fontSize: 14 }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <SkeletonLoader count={4} height="h-28" />
      ) : (
        <>
          {/* Hero: Calories */}
          <button
            type="button"
            onClick={() => navigate('/food')}
            className="hero-card hero-button"
            aria-label={`Calories today: ${todayCalories}. Tap to log food.`}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p className="label stat-label">Calories Today</p>
                <p className="mt-3 mb-1" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{todayCalories.toLocaleString()}</p>
                <p className="label text-[12px] mt-2 flex items-center gap-1.5">
                  tap to log food
                  <Chevron />
                </p>
              </div>
              <div className="flex" style={{ gap: 20 }}>
                <MacroRing label="Protein" value={todayProtein} max={150} color="protein" />
                <MacroRing label="Carbs" value={todayCarbs} max={250} color="carbs" />
                <MacroRing label="Fat" value={todayFat} max={65} color="fat" />
              </div>
            </div>
          </button>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card onClick={() => navigate('/finance')} aria-label={`Spent today: ${formatCurrency(todayTotal)}. Tap for details.`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Spent Today</p>
                  <p className="text-foreground mt-2" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{formatCurrency(todayTotal)}</p>
                  <p className="text-[13px] text-muted-foreground mt-2">this month: {formatCurrency(monthlyTotal)}</p>
                </div>
                <Chevron />
              </div>
            </Card>

            <Card onClick={() => navigate('/budget')} aria-label={`Budget left: ${formatCurrency(budgetLeft)}. Tap for details.`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="stat-label">Budget Left</p>
                  <p className="mt-2" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, color: budgetLeft < 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {formatCurrency(budgetLeft)}
                  </p>
                  {monthlyIncome > 0 ? (
                    <div className="mt-3 h-[6px] w-32 bg-muted rounded-[3px] overflow-hidden">
                      <div className="h-full bg-primary rounded-[3px]" style={{ width: `${Math.max(0, Math.min(100, (1 - monthlyTotal / discretionary) * 100))}%`, transition: 'width 0.5s ease' }} />
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground mt-2">set up your budget</p>
                  )}
                </div>
                <Chevron />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: 8 }}>
            <p className="stat-label" style={{ marginBottom: 16 }}>Quick Actions</p>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => navigate('/food')} className="action-card action-button group">
                <span style={{ fontSize: 24 }} className="block" aria-hidden="true">🍽️</span>
                <p style={{ fontSize: 15 }} className="font-semibold mt-3 text-foreground group-hover:text-primary transition-colors">Log Food</p>
                <p style={{ fontSize: 13 }} className="text-muted-foreground mt-1">Track a meal</p>
              </button>
              <button type="button" onClick={() => navigate('/finance')} className="action-card action-button group">
                <span style={{ fontSize: 24 }} className="block" aria-hidden="true">💸</span>
                <p style={{ fontSize: 15 }} className="font-semibold mt-3 text-foreground group-hover:text-primary transition-colors">Log Expense</p>
                <p style={{ fontSize: 13 }} className="text-muted-foreground mt-1">Add a purchase</p>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Chevron() {
  return (
    <svg className="card-chevron w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
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
