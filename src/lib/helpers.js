export function getMealType() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return 'breakfast'
  if (hour >= 11 && hour < 14) return 'lunch'
  if (hour >= 15 && hour < 17) return 'snack'
  if (hour >= 18 && hour < 22) return 'dinner'
  return 'snack'
}

// Everything in Vita is logged in Canadian dollars. Amounts are stored as
// plain CAD numbers — this formatter is display-only and converts nothing.
// Always two decimals: `minimumFractionDigits: 0` used to render $220.90 as
// "$220.9", which reads like a typo next to the other amounts.
const CAD = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(amount) {
  return CAD.format(Number.isFinite(amount) ? amount : 0)
}

// Parses a 'YYYY-MM-DD' string as a LOCAL date. Passing it straight to
// new Date() parses as UTC and lands on the previous day west of Greenwich.
function parseLocalDate(dateStr) {
  if (dateStr instanceof Date) return new Date(dateStr.getFullYear(), dateStr.getMonth(), dateStr.getDate())
  if (typeof dateStr !== 'string') return null
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

// The single date formatter for the app: "Today", "Yesterday", "Tomorrow",
// "Fri, Oct 30" inside the current year, "Feb 23, 2027" outside it.
export function formatDate(dateStr) {
  const date = parseLocalDate(dateStr)
  if (!date) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((date - today) / 86400000)

  if (days === 0) return 'Today'
  if (days === -1) return 'Yesterday'
  if (days === 1) return 'Tomorrow'

  return date.getFullYear() === today.getFullYear()
    ? date.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })
    : date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function getToday() {
  // Use LOCAL date, not UTC — toISOString() converts to UTC which can shift the day
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const EXPENSE_CATEGORIES = [
  { value: 'groceries', label: 'Groceries', emoji: '🛒' },
  { value: 'eating_out', label: 'Eating Out', emoji: '🍽️' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'shopping', label: 'Shopping & Ent', emoji: '🛍️' },
  { value: 'pet', label: 'Pet', emoji: '🐾' },
  { value: 'other', label: 'Other', emoji: '📦' },
]

// Budget allocation percentages for discretionary spending
export const BUDGET_ALLOCATIONS = [
  { category: 'groceries', label: 'Groceries', emoji: '🛒', percent: 22 },
  { category: 'eating_out', label: 'Eating Out', emoji: '🍽️', percent: 22 },
  { category: 'transport', label: 'Transport & Parking', emoji: '🚗', percent: 10 },
  { category: 'shopping', label: 'Shopping & Ent', emoji: '🛍️', percent: 18 },
  { category: 'pet', label: 'Pet', emoji: '🐾', percent: 4 },
  { category: 'other', label: 'Other', emoji: '📦', percent: 24 },
]

export function getCategoryEmoji(category) {
  return EXPENSE_CATEGORIES.find(c => c.value === category)?.emoji || '📦'
}
