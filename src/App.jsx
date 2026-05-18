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
import Admin from './pages/Admin'
import Login from './pages/Login'
import RequireFeature from './components/RequireFeature'
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
          {/* Always available */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<Admin />} />
          {/* Feature-gated */}
          <Route path="/food"       element={<RequireFeature feature="food"><Food /></RequireFeature>} />
          <Route path="/finance"    element={<RequireFeature feature="finance"><Finance /></RequireFeature>} />
          <Route path="/budget"     element={<RequireFeature feature="budget"><Budget /></RequireFeature>} />
          <Route path="/goals"      element={<RequireFeature feature="goals"><Goals /></RequireFeature>} />
          <Route path="/body-goals" element={<RequireFeature feature="goals"><BodyGoals /></RequireFeature>} />
          <Route path="/workout"    element={<RequireFeature feature="workout"><Workout /></RequireFeature>} />
          <Route path="/summary"    element={<RequireFeature feature="summary"><Summary /></RequireFeature>} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
