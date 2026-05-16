import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import SkeletonLoader from './components/SkeletonLoader'
import Dashboard from './pages/Dashboard'
import Food from './pages/Food'
import Finance from './pages/Finance'
import Budget from './pages/Budget'
import Goals from './pages/Goals'
import BodyGoals from './pages/BodyGoals'
import Workout from './pages/Workout'
import Summary from './pages/Summary'
import Settings from './pages/Settings'
import Login from './pages/Login'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { isAuthenticated, loading } = useAuth()

  // While we resolve the persisted session, show a neutral shell instead
  // of flashing the login screen to already-signed-in users.
  if (loading) {
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <div className="page-container"><SkeletonLoader count={4} height="h-28" /></div>
      </div>
    )
  }

  if (!isAuthenticated) return <Login />

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="safe-bottom">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/food" element={<Food />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/budget" element={<Budget />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/body-goals" element={<BodyGoals />} />
          <Route path="/workout" element={<Workout />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
