/**
 * Escape a value for CSV (RFC 4180).
 */
function escapeCSV(val) {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/**
 * Trigger a CSV file download in the browser.
 */
function downloadCSV(csvString, filename) {
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Export expenses as a CSV file.
 */
export function exportExpensesCSV(expenses, monthLabel) {
  const header = ['Date', 'Category', 'Amount', 'Note']
  const rows = expenses.map(e => [
    e.date,
    e.category || '',
    Number(e.amount).toFixed(2),
    e.note || '',
  ])

  const csv = [header, ...rows]
    .map(row => row.map(escapeCSV).join(','))
    .join('\n')

  const filename = `expenses-${monthLabel.toLowerCase().replace(/\s+/g, '-')}.csv`
  downloadCSV(csv, filename)
}

/**
 * Export food logs as a CSV file.
 */
export function exportFoodLogsCSV(logs, monthLabel) {
  const header = ['Date', 'Meal Type', 'Food Name', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)']
  const rows = logs.map(l => [
    new Date(l.logged_at).toLocaleDateString('en-US'),
    l.meal_type || '',
    l.food_name || '',
    l.calories ?? '',
    l.protein ?? '',
    l.carbs ?? '',
    l.fat ?? '',
  ])

  const csv = [header, ...rows]
    .map(row => row.map(escapeCSV).join(','))
    .join('\n')

  const filename = `food-log-${monthLabel.toLowerCase().replace(/\s+/g, '-')}.csv`
  downloadCSV(csv, filename)
}
