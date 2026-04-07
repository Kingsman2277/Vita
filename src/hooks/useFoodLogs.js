import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFoodLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('food_logs')
      .select('*')
      .order('logged_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const addFoodLog = async (log) => {
    let { error } = await supabase.from('food_logs').insert(log)
    // If description column doesn't exist yet, retry without it
    if (error && error.message?.toLowerCase().includes('description')) {
      const { description, ...rest } = log
      const retry = await supabase.from('food_logs').insert(rest)
      error = retry.error
    }
    if (error) { console.error('addFoodLog error:', error); throw error }
    await fetchLogs()
  }

  const updateFoodLog = async (id, updates) => {
    let { error } = await supabase.from('food_logs').update(updates).eq('id', id)
    // If description column doesn't exist yet, retry without it
    if (error && error.message?.toLowerCase().includes('description')) {
      const { description, ...rest } = updates
      const retry = await supabase.from('food_logs').update(rest).eq('id', id)
      error = retry.error
    }
    if (error) { console.error('updateFoodLog error:', error); throw error }
    await fetchLogs()
  }

  const deleteFoodLog = async (id) => {
    const { error } = await supabase.from('food_logs').delete().eq('id', id)
    if (error) throw error
    await fetchLogs()
  }

  const todayLogs = logs.filter(l => {
    const d = new Date(l.logged_at)
    const now = new Date()
    return d.toDateString() === now.toDateString()
  })

  const todayCalories = todayLogs.reduce((sum, l) => sum + Number(l.calories || 0), 0)
  const todayProtein = todayLogs.reduce((sum, l) => sum + Number(l.protein || 0), 0)
  const todayCarbs = todayLogs.reduce((sum, l) => sum + Number(l.carbs || 0), 0)
  const todayFat = todayLogs.reduce((sum, l) => sum + Number(l.fat || 0), 0)

  return {
    logs, loading, addFoodLog, updateFoodLog, deleteFoodLog, refetch: fetchLogs,
    todayLogs, todayCalories, todayProtein, todayCarbs, todayFat,
  }
}
