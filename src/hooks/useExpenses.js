import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getToday } from '../lib/helpers'

export function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setExpenses(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const addExpense = async (expense) => {
    const { error } = await supabase.from('expenses').insert(expense)
    if (error) throw error
    await fetchExpenses()
  }

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    await fetchExpenses()
  }

  const todayTotal = expenses
    .filter(e => e.date === getToday())
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const monthlyTotal = expenses
    .filter(e => {
      const d = new Date(e.date + 'T00:00:00')
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, e) => sum + Number(e.amount), 0)

  return { expenses, loading, addExpense, deleteExpense, todayTotal, monthlyTotal, refetch: fetchExpenses }
}
