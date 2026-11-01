// Information architecture for the design "D" redesign (docs/redesign §5).
//
// Five destinations: Home · Money · [+] · Body · Me. Money and Body are
// containers — each holds segments that map onto the old standalone pages,
// so a tab appears only when the user has at least one feature inside it.
import { BodyIcon, FinanceIcon, HomeIcon, MeIcon } from '../components/NavIcons'

export const MONEY_SEGMENTS = [
  { value: 'expenses', label: 'Expenses', feature: 'finance' },
  { value: 'budget',   label: 'Budget',   feature: 'budget' },
  { value: 'insights', label: 'Insights', feature: 'summary' },
]

export const BODY_SEGMENTS = [
  { value: 'training', label: 'Training', feature: 'workout' },
  { value: 'food',     label: 'Food',     feature: 'food' },
  { value: 'progress', label: 'Progress', feature: 'goals' },
]

// `features: null` means the tab is always on — the user must be able to
// reach Home and their account however the admin has gated things.
export const TABS = [
  { to: '/home',  label: 'Home',  icon: HomeIcon,    features: null },
  { to: '/money', label: 'Money', icon: FinanceIcon, features: ['finance', 'budget', 'summary'] },
  { to: '/body',  label: 'Body',  icon: BodyIcon,    features: ['workout', 'food', 'goals'] },
  { to: '/me',    label: 'Me',    icon: MeIcon,      features: null },
]

export function visibleSegments(segments, hasFeature) {
  return segments.filter(s => hasFeature(s.feature))
}

export function isTabVisible(tab, hasFeature) {
  return !tab.features || tab.features.some(hasFeature)
}

// Old paths stay alive: this is a PWA, so bookmarks and the home-screen
// shortcut may still point at any of them.
export const LEGACY_REDIRECTS = {
  '/dashboard': '/home',
  '/finance': '/money/expenses',
  '/budget': '/money/budget',
  '/summary': '/money/insights',
  '/workout': '/body/training',
  '/food': '/body/food',
  '/goals': '/body/progress',
  '/settings': '/me',
}
