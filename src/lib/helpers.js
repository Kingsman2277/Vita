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
  return new Date().toISOString().split('T')[0]
}

export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'groceries', label: 'Groceries', emoji: '🛒' },
  { value: 'girlfriend', label: 'Girlfriend', emoji: '❤️' },
  { value: 'fun', label: 'Fun', emoji: '🎮' },
  { value: 'necessities', label: 'Necessities', emoji: '🏠' },
  { value: 'other', label: 'Other', emoji: '📦' },
]

export function getCategoryEmoji(category) {
  return EXPENSE_CATEGORIES.find(c => c.value === category)?.emoji || '📦'
}
