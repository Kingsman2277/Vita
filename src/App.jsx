import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import BottomNav from './components/ui/BottomNav'
import QuickAddSheet from './components/QuickAddSheet'
import Sidebar from './components/Sidebar'
import SkeletonLoader from './components/SkeletonLoader'
import Dashboard from './pages/Dashboard'
import Money from './pages/Money'
import Body from './pages/Body'
import Me from './pages/Me'
import Admin from './pages/Admin'
import Login from './pages/Login'
import DevUI from './pages/DevUI'
import { LEGACY_REDIRECTS } from './lib/nav'
import { useAuth } from './hooks/useAuth'

export default function App() {
  const { isAuthenticated, loading } = useAuth()
  const [quickAddOpen, setQuickAddOpen] = useState(false)

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
      <Sidebar onQuickAdd={() => setQuickAddOpen(true)} />
      <div className="safe-bottom">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Always available */}
          <Route path="/home" element={<Dashboard />} />
          <Route path="/me" element={<Me />} />
          <Route path="/admin" element={<Admin />} />

          {/* Tab containers — each filters its own segments by feature */}
          <Route path="/money" element={<Money />} />
          <Route path="/money/:segment" element={<Money />} />
          <Route path="/body" element={<Body />} />
          <Route path="/body/:segment" element={<Body />} />

          {/* The app is an installed PWA, so old bookmarks and the
              home-screen shortcut can still point at any previous path. */}
          {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}

          {/* Component gallery for the redesign — dev builds only, never shipped. */}
          {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUI />} />}

          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </div>
      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />
      <QuickAddSheet open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
    </div>
  )
}
