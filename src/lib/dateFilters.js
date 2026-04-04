/**
 * Filter an array of items to those within a specific year/month.
 * Handles both date strings (YYYY-MM-DD) and ISO timestamps.
 */
export function filterByMonth(items, year, month, dateField) {
  return (items || []).filter(item => {
    const raw = item[dateField]
    if (!raw) return false
    // date field is YYYY-MM-DD string, logged_at is ISO timestamp
    const d = raw.includes('T') ? new Date(raw) : new Date(raw + 'T00:00:00')
    return d.getMonth() === month && d.getFullYear() === year
  })
}

/**
 * Get the start and end Date objects for a given year/month.
 */
export function getMonthRange(year, month) {
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Format a year/month pair as "April 2026".
 */
export function formatMonthLabel(year, month) {
  return new Date(year, month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}
