import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Food from './pages/Food'
import Finance from './pages/Finance'
import Budget from './pages/Budget'
import Goals from './pages/Goals'
import Summary from './pages/Summary'

function PageWrapper({ children }) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setActive(true))
    return () => setActive(false)
  }, [])
  return (
    <div className={active ? 'page-active' : 'page-enter'}>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar />
      <div className="safe-bottom">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PageWrapper><Dashboard /></PageWrapper>} />
          <Route path="/food" element={<PageWrapper><Food /></PageWrapper>} />
          <Route path="/finance" element={<PageWrapper><Finance /></PageWrapper>} />
          <Route path="/budget" element={<PageWrapper><Budget /></PageWrapper>} />
          <Route path="/goals" element={<PageWrapper><Goals /></PageWrapper>} />
          <Route path="/summary" element={<PageWrapper><Summary /></PageWrapper>} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  )
}
