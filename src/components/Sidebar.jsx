import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useIsAdmin } from '../hooks/useAdmin'
import { useFeatures } from '../hooks/useFeatures'
import { NAV_ITEMS, AdminIcon, SettingsIcon } from './NavIcons'

/**
 * One row of the sidebar. Every row is a 44px-tall click target that
 * spans the full rail width, so hitting it never needs precision.
 *
 * Active state is carried by three cues at once (tinted background,
 * teal label+icon, and a left accent bar) because the old single cue —
 * `bg-sidebar-accent` at #141820 on a #0C0F14 rail — was a ~4-point
 * luminance difference and effectively invisible.
 */
function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <span className="nav-item-bar" aria-hidden="true" />
      <Icon className="nav-item-icon" />
      <span className="nav-item-label">{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const { username } = useAuth()
  const { isAdmin } = useIsAdmin()
  const { hasFeature, loading: featuresLoading } = useFeatures()

  // Until features resolve we only know Home is allowed. Rendering just
  // that one row makes the rail visibly "pop" as the rest arrive, so
  // hold placeholder rows of the same height instead — the layout is
  // then stable from first paint.
  const visible = NAV_ITEMS.filter(i => !i.feature || hasFeature(i.feature))

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex-col z-50">
      <div className="px-5 pt-7 pb-5">
        <h1 className="text-[18px] font-bold tracking-[0.04em] text-sidebar-foreground leading-none">
          <span className="text-primary">V</span>ita
        </h1>
        <p className="text-[11px] tracking-[0.06em] uppercase text-muted-foreground mt-[7px]">Life OS</p>
      </div>

      <nav className="flex-1 px-3 space-y-[3px]" aria-label="Main navigation">
        {featuresLoading
          ? NAV_ITEMS.map(({ to }) => <div key={to} className="nav-item-skeleton" aria-hidden="true" />)
          : visible.map(item => <NavItem key={item.to} {...item} />)}
      </nav>

      <div className="px-3 pt-3 pb-1 space-y-[3px] border-t border-sidebar-border mt-3">
        {username && isAdmin && <NavItem to="/admin" label="Admin" icon={AdminIcon} />}
        {username && <NavItem to="/settings" label="Settings" icon={SettingsIcon} />}
      </div>

      {username && (
        <div className="flex items-center gap-[10px] px-5 py-4">
          <div
            className="w-7 h-7 shrink-0 rounded-full bg-sidebar-accent border border-sidebar-border grid place-items-center text-[11px] font-semibold text-primary uppercase"
            aria-hidden="true"
          >
            {username.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-sidebar-foreground truncate leading-tight">{username}</p>
            <p className="text-[10px] text-muted-foreground/60 leading-tight mt-[1px]">Vita v1.0</p>
          </div>
        </div>
      )}
    </aside>
  )
}
