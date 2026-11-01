// Quick assertions for the shared formatters. No test runner in this project
// yet — run with `npm run check:helpers`.
import assert from 'node:assert/strict'
import { formatCurrency, formatDate } from '../src/lib/helpers.js'

const cases = []
const check = (name, fn) => {
  try { fn(); cases.push(['ok', name]) }
  catch (err) { cases.push(['FAIL', `${name} — ${err.message}`]) }
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d) }

check('currency: always two decimals', () => {
  assert.equal(formatCurrency(220.9), '$220.90')
  assert.equal(formatCurrency(1069.05), '$1,069.05')
  assert.equal(formatCurrency(19), '$19.00')
})
check('currency: negatives and zero', () => {
  assert.equal(formatCurrency(-42.18), '-$42.18')
  assert.equal(formatCurrency(0), '$0.00')
})
check('currency: non-numeric falls back to zero', () => {
  assert.equal(formatCurrency(undefined), '$0.00')
  assert.equal(formatCurrency(null), '$0.00')
  assert.equal(formatCurrency(NaN), '$0.00')
})
check('date: relative days', () => {
  assert.equal(formatDate(shift(0)), 'Today')
  assert.equal(formatDate(shift(-1)), 'Yesterday')
  assert.equal(formatDate(shift(1)), 'Tomorrow')
})
check('date: weekday form inside the current year', () => {
  const y = new Date().getFullYear()
  const sample = formatDate(`${y}-03-14`)
  assert.match(sample, /^(Today|Yesterday|Tomorrow|[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2})$/, `got "${sample}"`)
})
check('date: year shown outside the current year', () => {
  assert.equal(formatDate('2027-02-23'), 'Feb 23, 2027')
})
check('date: parsed as local, not UTC', () => {
  assert.equal(formatDate('2027-02-23'), 'Feb 23, 2027')
  assert.equal(formatDate('2027-01-01'), 'Jan 1, 2027')
})
check('date: garbage in, empty string out', () => {
  assert.equal(formatDate(''), '')
  assert.equal(formatDate(null), '')
  assert.equal(formatDate('not-a-date'), '')
})

for (const [status, name] of cases) console.log(`${status === 'ok' ? '  ok' : 'FAIL'}  ${name}`)
const failed = cases.filter(([s]) => s !== 'ok')
console.log(`\n${cases.length - failed.length}/${cases.length} passed`)
process.exit(failed.length ? 1 : 0)
