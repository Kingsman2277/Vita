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
      <header className="flex items-start justify-between" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">Good {getGreeting()}</h1>
          <p className="text-muted-foreground" style={{ fontSize: 14, marginTop: 6 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label="Open Settings"
          className="month-picker-btn"
          style={{ width: 40, height: 40, flexShrink: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

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
            <div className="hero-row">
              <div className="text-left" style={{ minWidth: 0 }}>
                <p className="label stat-label">Calories Today</p>
                <p style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 14 }}>{todayCalories.toLocaleString()}</p>
                <p className="label flex items-center" style={{ fontSize: 12, marginTop: 12, gap: 6 }}>
                  tap to log food
                  <Chevron />
                </p>
              </div>
              <div className="hero-macros">
                <MacroRing label="Protein" value={todayProtein} max={150} color="protein" />
                <MacroRing label="Carbs" value={todayCarbs} max={250} color="carbs" />
                <MacroRing label="Fat" value={todayFat} max={65} color="fat" />
              </div>
            </div>
          </button>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card onClick={() => navigate('/finance')} aria-label={`Spent today: ${formatCurrency(todayTotal)}. Tap for details.`}>
              <div className="flex items-center justify-between" style={{ gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <p className="stat-label">Spent Today</p>
                  <p className="text-foreground" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 12 }}>{formatCurrency(todayTotal)}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 12 }}>this month: {formatCurrency(monthlyTotal)}</p>
                </div>
                <Chevron />
              </div>
            </Card>

            <Card onClick={() => navigate('/budget')} aria-label={`Budget left: ${formatCurrency(budgetLeft)}. Tap for details.`}>
              <div className="flex items-center justify-between" style={{ gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p className="stat-label">Budget Left</p>
                  <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1, marginTop: 12, color: budgetLeft < 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {formatCurrency(budgetLeft)}
                  </p>
                  {monthlyIncome > 0 ? (
                    <div className="progress-bar" style={{ marginTop: 14, maxWidth: 180 }}>
                      <div className="progress-bar-fill" style={{ width: `${Math.max(0, Math.min(100, (1 - monthlyTotal / discretionary) * 100))}%` }} />
                    </div>
                  ) : (
                    <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 12 }}>set up your budget</p>
                  )}
                </div>
                <Chevron />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <section>
            <p className="stat-label" style={{ marginBottom: 14 }}>Quick Actions</p>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => navigate('/food')} className="action-card action-button group">
                <span style={{ fontSize: 26, display: 'block', lineHeight: 1 }} aria-hidden="true">🍽️</span>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors" style={{ fontSize: 15, marginTop: 14 }}>Log Food</p>
                <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 4 }}>Track a meal</p>
              </button>
              <button type="button" onClick={() => navigate('/finance')} className="action-card action-button group">
                <span style={{ fontSize: 26, display: 'block', lineHeight: 1 }} aria-hidden="true">💸</span>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors" style={{ fontSize: 15, marginTop: 14 }}>Log Expense</p>
                <p className="text-muted-foreground" style={{ fontSize: 13, marginTop: 4 }}>Add a purchase</p>
              </button>
            </div>
          </section>
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
