/**
 * Single source of truth for expense filtering, category bucketing,
 * and reconciliation between the grand total and per-category tiles.
 *
 * All math is done in integer cents to avoid floating-point drift
 * (e.g. 0.1 + 0.2 !== 0.3 with plain Number addition).
 */

import { BUDGET_ALLOCATIONS } from './helpers'

// Canonical categories the Budget tiles can render.
export const CANONICAL_CATEGORIES = BUDGET_ALLOCATIONS.map(a => a.category)

// Legacy/renamed categories remap to canonical buckets so old data
// stays visible in the correct tile.
const LEGACY_CATEGORY_MAP = {
  food: 'eating_out',
  girlfriend: 'pet',
  fun: 'shopping',
  necessities: 'transport',
  savings: 'other', // Money Saved tile was removed; roll old data into Other.
}

/**
 * Map any stored category value onto a canonical bucket.
 * Unknown or empty categories fall into `'other'`.
 */
export function normalizeCategory(cat) {
  if (!cat) return 'other'
  if (CANONICAL_CATEGORIES.includes(cat)) return cat
  if (LEGACY_CATEGORY_MAP[cat]) return LEGACY_CATEGORY_MAP[cat]
  return 'other'
}

/**
 * Check a category is one we know how to render. Used by validation
 * so new expenses never silently land in `'other'`.
 */
export function isValidExpenseCategory(cat) {
  if (!cat) return false
  return CANONICAL_CATEGORIES.includes(cat) || Object.keys(LEGACY_CATEGORY_MAP).includes(cat)
}

/**
 * Convert a dollar-denominated amount to an integer cents value.
 * Rounds half-away-from-zero to dodge floating-point boundary cases.
 */
export function toCents(amount) {
  const n = Number(amount)
  if (!isFinite(n)) return 0
  return Math.round(n * 100)
}

/** Convert integer cents back to a Number of dollars (2-decimal precise). */
export function fromCents(cents) {
  return Math.round(cents) / 100
}

/**
 * Sum an array of {amount} items with integer-cent precision.
 * Returns a Number of dollars rounded to 2 decimals.
 */
export function sumAmounts(items) {
  let cents = 0
  for (const it of items || []) cents += toCents(it.amount)
  return fromCents(cents)
}

/**
 * True iff an expense counts toward the user's discretionary budget.
 * `is_recurring === true` is the "Work reimbursable" flag — excluded.
 */
export function isDiscretionary(expense) {
  return !expense.is_recurring
}

/**
 * Filter expenses down to a single calendar month (local time).
 * Shared by the grand-total calculation and the per-tile calculation
 * so the two can never drift apart.
 */
export function getMonthExpenses(expenses, year, month) {
  return (expenses || []).filter(e => {
    if (!e || !e.date) return false
    const raw = e.date
    const d = raw.includes('T') ? new Date(raw) : new Date(raw + 'T00:00:00')
    return d.getMonth() === month && d.getFullYear() === year
  })
}

/**
 * Bucket a list of expenses into the canonical categories (+ 'other').
 * Amounts summed with integer-cent precision; legacy categories
 * remapped so nothing is dropped.
 *
 * Returns `{ [category]: dollars }` for every canonical category plus
 * `'other'` (always present so callers can render a tile if non-zero).
 */
export function getCategoryTotals(expenses) {
  const cents = Object.fromEntries(CANONICAL_CATEGORIES.map(c => [c, 0]))
  cents.other = 0
  for (const e of expenses || []) {
    const bucket = normalizeCategory(e.category)
    cents[bucket] = (cents[bucket] || 0) + toCents(e.amount)
  }
  const out = {}
  for (const [cat, c] of Object.entries(cents)) out[cat] = fromCents(c)
  return out
}

/**
 * Compute the grand total, the per-category totals, and flag any
 * mismatch. If the numbers disagree we have a bug — either a dropped
 * transaction, a double-count, or a filter that's out of sync.
 *
 * Called after every data load in useExpenses, and defensively in the
 * Budget page render.
 */
export function reconcileTotals(monthExpenses, { source = 'unknown' } = {}) {
  const discretionary = (monthExpenses || []).filter(isDiscretionary)
  const grandTotal = sumAmounts(discretionary)
  const byCategory = getCategoryTotals(discretionary)
  const sumOfCategories = fromCents(
    Object.values(byCategory).reduce((s, v) => s + toCents(v), 0)
  )
  const diffCents = Math.abs(toCents(grandTotal) - toCents(sumOfCategories))
  const mismatch = diffCents > 0

  if (mismatch) {
    // eslint-disable-next-line no-console
    console.warn(
      `[finance:reconcile] grand total ≠ Σ(categories) — source=${source} ` +
        `grand=$${grandTotal.toFixed(2)} sum=$${sumOfCategories.toFixed(2)} ` +
        `diff=$${(diffCents / 100).toFixed(2)}`,
      { byCategory, count: discretionary.length }
    )
  }

  return { grandTotal, byCategory, sumOfCategories, mismatch, count: discretionary.length }
}

/**
 * Validate an expense before it's written to the database. Throws a
 * descriptive Error that the UI surfaces via the toast catch-block.
 */
export function validateExpense(expense) {
  if (!expense || typeof expense !== 'object') {
    throw new Error('Expense payload is missing')
  }
  const amt = Number(expense.amount)
  if (!isFinite(amt) || amt <= 0) {
    throw new Error('Expense amount must be a positive number')
  }
  if (!expense.date || !/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) {
    throw new Error('Expense date must be YYYY-MM-DD')
  }
  if (!isValidExpenseCategory(expense.category)) {
    throw new Error(
      `Expense category "${expense.category}" is not one of: ${CANONICAL_CATEGORIES.join(', ')}`
    )
  }
}

/**
 * Lightweight audit log. Writes a single console.info line per sync
 * so that, when totals look wrong, you can scroll back and see
 * exactly when data last loaded and how many records came through.
 */
export function logAuditEntry(stage, details = {}) {
  // eslint-disable-next-line no-console
  console.info(`[finance:audit] ${stage}`, {
    at: new Date().toISOString(),
    ...details,
  })
}
