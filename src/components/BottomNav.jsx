import { NavLink } from 'react-router-dom'
import { useFeatures } from '../hooks/useFeatures'
import { NAV_ITEMS } from './NavIcons'

export default function BottomNav() {
  const { hasFeature, loading } = useFeatures()
  const visible = NAV_ITEMS.filter(item => !item.feature || hasFeature(item.feature))
  // While features load, render only the always-on items (Home) to
  // avoid flashing locked entries in and back out.
  const items = loading ? NAV_ITEMS.filter(i => !i.feature) : visible
  return (
    <nav className="bottom-nav md:hidden" aria-label="Main navigation">
      <div className="bottom-nav-inner">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon className="bottom-nav-icon" />
            <span className="bottom-nav-label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
