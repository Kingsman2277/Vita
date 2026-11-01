import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useIsAdmin } from '../hooks/useAdmin'
import { useFeatures } from '../hooks/useFeatures'
import { AdminIcon, PlusIcon } from './NavIcons'
import { isTabVisible, TABS } from '../lib/nav'

/**
 * Desktop rail (>=768px). Same four destinations and the same "+" as the
 * mobile nav (docs/redesign §5) — labels stay here, where there is room
 * for them and no tab bar to crowd.
 *
 * Each row is a 44px-tall target spanning the full rail width. Active
 * state carries three cues at once (tinted background, accent label+icon,
 * left bar) because a single background tint at these luminances was
 * effectively invisible.
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

export default function Sidebar({ onQuickAdd }) {
  const { username } = useAuth()
  const { isAdmin } = useIsAdmin()
  const { hasFeature, loading: featuresLoading } = useFeatures()

  const visible = TABS.filter(t => isTabVisible(t, hasFeature))

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex-col z-50">
      <div className="px-5 pt-7 pb-5">
        <h1 className="text-[18px] font-bold tracking-[0.04em] text-sidebar-foreground leading-none">
          <span className="text-accent">V</span>ita
        </h1>
        <p className="text-[11px] tracking-[0.06em] uppercase text-muted-foreground mt-[7px]">Life OS</p>
      </div>

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onQuickAdd}
          className="w-full h-11 rounded-[12px] bg-white-btn text-bg font-semibold text-sm flex items-center justify-center gap-2 transition-opacity duration-150 active:opacity-80"
        >
          <PlusIcon className="w-[18px] h-[18px]" />
          Quick add
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-[3px]" aria-label="Main navigation">
        {/* Hold same-height placeholders while features resolve, so the
            rail doesn't visibly pop as rows arrive. */}
        {featuresLoading
          ? TABS.map(({ to }) => <div key={to} className="nav-item-skeleton" aria-hidden="true" />)
          : visible.map(tab => <NavItem key={tab.to} {...tab} />)}
      </nav>

      {username && isAdmin && (
        <div className="px-3 pt-3 pb-1 border-t border-sidebar-border mt-3">
          <NavItem to="/admin" label="Admin" icon={AdminIcon} />
        </div>
      )}

      {username && (
        <div className="flex items-center gap-[10px] px-5 py-4">
          <div
            className="w-7 h-7 shrink-0 rounded-full grid place-items-center text-[11px] font-semibold text-white uppercase"
            style={{ background: 'radial-gradient(circle at 30% 25%, #FF8A55, #B8380F)' }}
            aria-hidden="true"
          >
            {username.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-sidebar-foreground truncate leading-tight">{username}</p>
            <p className="text-[10px] text-muted-foreground leading-tight mt-[1px]">Vita v1.0</p>
          </div>
        </div>
      )}
    </aside>
  )
}
