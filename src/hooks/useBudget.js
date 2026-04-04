import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useBudget() {
  const [budget, setBudget] = useState(null)
  const [recurring, setRecurring] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBudget = useCallback(async () => {
    setLoading(true)
    const { data: budgetData } = await supabase
      .from('budget')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    setBudget(budgetData)

    const { data: recurringData } = await supabase
      .from('recurring_expenses')
      .select('*')
      .order('day_of_month', { ascending: true })
    setRecurring(recurringData || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchBudget() }, [fetchBudget])

  const saveBudget = async ({ monthly_income, savings_target }) => {
    if (budget?.id) {
      const { error } = await supabase
        .from('budget')
        .update({ monthly_income, savings_target, updated_at: new Date().toISOString() })
        .eq('id', budget.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('budget')
        .insert({ monthly_income, savings_target })
      if (error) throw error
    }
    await fetchBudget()
  }

  const addRecurring = async (item) => {
    const { error } = await supabase.from('recurring_expenses').insert(item)
    if (error) throw error
    await fetchBudget()
  }

  const updateRecurring = async (id, updates) => {
    const { error } = await supabase.from('recurring_expenses').update(updates).eq('id', id)
    if (error) throw error
    await fetchBudget()
  }

  const deleteRecurring = async (id) => {
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
    if (error) throw error
    await fetchBudget()
  }

  const totalRecurring = recurring.reduce((sum, r) => sum + Number(r.amount), 0)
  const monthlyIncome = Number(budget?.monthly_income || 0)
  const savingsTarget = Number(budget?.savings_target || 0)
  const discretionary = monthlyIncome - totalRecurring - savingsTarget

  return {
    budget, recurring, loading, saveBudget, addRecurring, updateRecurring, deleteRecurring,
    totalRecurring, monthlyIncome, savingsTarget, discretionary, refetch: fetchBudget,
  }
}
