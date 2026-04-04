import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useGoals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false })
    setGoals(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchGoals() }, [fetchGoals])

  const saveGoal = async (goal) => {
    const existing = goals.find(g => g.type === goal.type)
    if (existing) {
      const { error } = await supabase
        .from('goals')
        .update({ data: goal.data, target_date: goal.target_date })
        .eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await supabase.from('goals').insert(goal)
      if (error) throw error
    }
    await fetchGoals()
  }

  const bodyGoal = goals.find(g => g.type === 'body')
  const financialGoal = goals.find(g => g.type === 'financial')

  return { goals, loading, saveGoal, bodyGoal, financialGoal, refetch: fetchGoals }
}
