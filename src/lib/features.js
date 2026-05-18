// Catalog of features that can be toggled per user from the admin
// dashboard. Keep these keys in sync with the user_profiles.enabled_features
// values used by the supabase-feature-gating-migration.sql.
//
// Home/Dashboard and Settings are intentionally NOT in the catalog —
// they're always available so users can sign in and manage their account
// regardless of which features the admin has enabled.

export const FEATURE_CATALOG = [
  { key: 'food',              label: 'Food Log',           emoji: '🥗', description: 'Track calories and macros' },
  { key: 'workout',           label: 'Workout',            emoji: '💪', description: '5-day machine-based program' },
  { key: 'finance',           label: 'Finance',            emoji: '💳', description: 'Log expenses' },
  { key: 'budget',            label: 'Budget',             emoji: '📊', description: 'Categorized monthly budget' },
  { key: 'goals',             label: 'Goals + Body Goals', emoji: '🎯', description: 'Financial + body goals, weight log, body metrics' },
  { key: 'summary',           label: 'Summary',            emoji: '📈', description: 'Monthly cross-section across all data' },
  { key: 'ai_food_analysis',  label: 'AI Food Analysis',   emoji: '✨', description: 'Smart Analyze text + photo. Uses your OpenAI credits.' },
]

export const DEFAULT_FEATURES = ['food', 'finance', 'budget', 'goals', 'summary']
export const ALL_FEATURES = FEATURE_CATALOG.map(f => f.key)

// Map route path → feature key it requires. Routes not in this map
// (Dashboard, Settings, Admin, Login) bypass feature gating.
export const ROUTE_TO_FEATURE = {
  '/food': 'food',
  '/workout': 'workout',
  '/finance': 'finance',
  '/budget': 'budget',
  '/goals': 'goals',
  '/body-goals': 'goals',
  '/summary': 'summary',
}
