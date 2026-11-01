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
    const { error } = await supabase.from('food_logs').insert(log)
    if (error) { console.error('addFoodLog error:', error); throw error }
    await fetchLogs()
  }

  const updateFoodLog = async (id, updates) => {
    const { error } = await supabase.from('food_logs').update(updates).eq('id', id)
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

/**
 * Sum micronutrients across an array of food_log rows.
 * Returns { fiber_g, sugar_g, sodium_mg, ... } with totals.
 * Gracefully ignores entries with no micronutrients column.
 */
export const MICRO_KEYS = [
  { key: 'fiber_g', label: 'Fiber', unit: 'g', rda: 28 },
  { key: 'sugar_g', label: 'Sugar', unit: 'g', rda: 30, isLimit: true },
  { key: 'sodium_mg', label: 'Sodium', unit: 'mg', rda: 2300, isLimit: true },
  { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg', rda: 300, isLimit: true },
  { key: 'saturated_fat_g', label: 'Sat Fat', unit: 'g', rda: 20, isLimit: true },
  { key: 'vitamin_a_mcg', label: 'Vitamin A', unit: 'mcg', rda: 900 },
  { key: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg', rda: 90 },
  { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg', rda: 15 },
  { key: 'calcium_mg', label: 'Calcium', unit: 'mg', rda: 1000 },
  { key: 'iron_mg', label: 'Iron', unit: 'mg', rda: 18 },
  { key: 'potassium_mg', label: 'Potassium', unit: 'mg', rda: 3400 },
  { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg', rda: 420 },
]

export function sumMicronutrients(foodLogs) {
  const totals = {}
  for (const { key } of MICRO_KEYS) totals[key] = 0
  let anyData = false
  for (const log of foodLogs || []) {
    const m = log.micronutrients
    if (!m || typeof m !== 'object') continue
    anyData = true
    for (const { key } of MICRO_KEYS) {
      if (m[key] != null && isFinite(Number(m[key]))) {
        totals[key] += Number(m[key])
      }
    }
  }
  return anyData ? totals : null
}
