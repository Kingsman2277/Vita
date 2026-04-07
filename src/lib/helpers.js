export function getMealType() {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 10) return 'breakfast'
  if (hour >= 11 && hour < 14) return 'lunch'
  if (hour >= 15 && hour < 17) return 'snack'
  if (hour >= 18 && hour < 22) return 'dinner'
  return 'snack'
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

export function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
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
  { value: 'savings', label: 'Money Saved', emoji: '💰' },
]

// Budget allocation percentages for discretionary spending
export const BUDGET_ALLOCATIONS = [
  { category: 'groceries', label: 'Groceries', emoji: '🛒', percent: 30 },
  { category: 'eating_out', label: 'Eating Out', emoji: '🍽️', percent: 20 },
  { category: 'transport', label: 'Transport & Parking', emoji: '🚗', percent: 13 },
  { category: 'shopping', label: 'Shopping & Ent', emoji: '🛍️', percent: 20 },
  { category: 'pet', label: 'Pet', emoji: '🐾', percent: 7 },
  { category: 'savings', label: 'Money Saved', emoji: '💰', percent: 10 },
]

export function getCategoryEmoji(category) {
  return EXPENSE_CATEGORIES.find(c => c.value === category)?.emoji || '📦'
}
