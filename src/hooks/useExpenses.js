import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { getToday } from '../lib/helpers'
import {
  getMonthExpenses,
  isDiscretionary,
  sumAmounts,
  reconcileTotals,
  validateExpense,
  logAuditEntry,
} from '../lib/financeReconciliation'

export function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    const rows = data || []
    setExpenses(rows)
    setLoading(false)
    logAuditEntry('fetch:expenses', {
      count: rows.length,
      ok: !error,
      error: error?.message || null,
    })
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const addExpense = async (expense) => {
    validateExpense(expense)
    const { error } = await supabase.from('expenses').insert(expense)
    if (error) throw error
    logAuditEntry('insert:expense', { category: expense.category, amount: expense.amount })
    await fetchExpenses()
  }

  const updateExpense = async (id, updates) => {
    validateExpense(updates)
    const { error } = await supabase.from('expenses').update(updates).eq('id', id)
    if (error) throw error
    logAuditEntry('update:expense', { id, category: updates.category, amount: updates.amount })
    await fetchExpenses()
  }

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    logAuditEntry('delete:expense', { id })
    await fetchExpenses()
  }

  // Today totals (discretionary only — exclude reimbursable)
  const todayTotal = useMemo(() => {
    const today = getToday()
    return sumAmounts(expenses.filter(e => e.date === today && isDiscretionary(e)))
  }, [expenses])

  // Current-month slice — single source of truth shared with Budget tiles.
  const thisMonthExpenses = useMemo(() => {
    const now = new Date()
    return getMonthExpenses(expenses, now.getFullYear(), now.getMonth())
  }, [expenses])

  // Reconcile after every data change so drift is caught immediately.
  const reconciliation = useMemo(
    () => reconcileTotals(thisMonthExpenses, { source: 'useExpenses' }),
    [thisMonthExpenses]
  )

  const monthlyTotal = reconciliation.grandTotal
  const monthlyRecurringActual = useMemo(
    () => sumAmounts(thisMonthExpenses.filter(e => !isDiscretionary(e))),
    [thisMonthExpenses]
  )

  return {
    expenses,
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    todayTotal,
    monthlyTotal,
    monthlyRecurringActual,
    reconciliation,
    refetch: fetchExpenses,
  }
}
