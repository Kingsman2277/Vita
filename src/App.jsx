import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Food from './pages/Food'
import Finance from './pages/Finance'
import Budget from './pages/Budget'
import Goals from './pages/Goals'
import BodyGoals from './pages/BodyGoals'
import Summary from './pages/Summary'

export default function App() {
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
          <Route path="/summary" element={<Summary />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
