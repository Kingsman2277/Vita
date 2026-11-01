import { NavLink } from 'react-router-dom'
import { PlusIcon } from '../NavIcons'
import { useFeatures } from '../../hooks/useFeatures'
import { isTabVisible, TABS } from '../../lib/nav'

// Icons only, per the approved mockup — every item carries an aria-label
// so the accessibility tree still names it. 52x52 clears the 44px minimum
// target, and the active tab gets a white icon plus an 18x3 orange bar.
function Tab({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      aria-label={label}
      className="relative w-[52px] h-[52px] grid place-items-center text-[#7A7A80] [&.active]:text-white"
    >
      {({ isActive }) => (
        <>
          <Icon className="w-[26px] h-[26px]" />
          {isActive && (
            <span
              className="absolute bottom-0 w-[18px] h-[3px] rounded-sm bg-accent"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function BottomNav({ onQuickAdd }) {
  const { hasFeature, loading } = useFeatures()

  // Until features resolve, show only the always-on tabs. A gated tab that
  // appears and then vanishes is worse than one that arrives a beat late.
  const tabs = TABS.filter(t => (loading ? !t.features : isTabVisible(t, hasFeature)))
  const half = Math.ceil(tabs.length / 2)

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 px-5 pt-3.5 bg-gradient-to-b from-transparent to-bg to-30%"
      style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between">
        {tabs.slice(0, half).map(tab => <Tab key={tab.to} {...tab} />)}

        <button
          type="button"
          onClick={onQuickAdd}
          aria-label="Quick add"
          className="w-[52px] h-[52px] shrink-0 rounded-[14px] bg-white-btn text-bg grid place-items-center transition-transform duration-150 active:scale-95"
        >
          <PlusIcon className="w-[26px] h-[26px]" />
        </button>

        {tabs.slice(half).map(tab => <Tab key={tab.to} {...tab} />)}
      </div>
    </nav>
  )
}
