import { useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Learning loop for the AI food analysis.
 *
 * - `findSimilar` returns up to N past corrections that look like the
 *   current prompt, so we can inject them as "you've corrected similar
 *   items this way" context.
 * - `saveCorrection` writes a row whenever the user saves a log that
 *   materially differs from the AI's pre-fill.
 */
const MATERIAL_CALORIE_DELTA = 5
const MATERIAL_MACRO_DELTA = 2

export function useAiCorrections() {
  const findSimilar = useCallback(async ({ source, aiFoodName, limit = 3 }) => {
    // Two lookups: exact-ish match on AI's food_name, plus a fuzzy
    // full-text search on source description. Union, dedupe, limit.
    const results = []

    if (aiFoodName) {
      const { data } = await supabase
        .from('ai_corrections')
        .select('*')
        .ilike('ai_food_name', aiFoodName)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (data) results.push(...data)
    }

    if (source) {
      // Strip "photo:" / "text:" prefix for the fts query
      const query = source.replace(/^(photo|text):/, '').trim()
      if (query.length > 2) {
        const { data } = await supabase
          .from('ai_corrections')
          .select('*')
          .textSearch('ai_food_name', query, { type: 'websearch', config: 'english' })
          .order('created_at', { ascending: false })
          .limit(limit)
        if (data) {
          for (const row of data) {
            if (!results.find(r => r.id === row.id)) results.push(row)
          }
        }
      }
    }

    return results.slice(0, limit)
  }, [])

  const saveCorrection = useCallback(async ({ source, ai, user }) => {
    if (!ai) return
    const caloriesShift = Math.abs(Number(user.calories || 0) - Number(ai.calories || 0))
    const proteinShift = Math.abs(Number(user.protein || 0) - Number(ai.protein_g || 0))
    const carbsShift = Math.abs(Number(user.carbs || 0) - Number(ai.carbs_g || 0))
    const fatShift = Math.abs(Number(user.fat || 0) - Number(ai.fat_g || 0))
    const nameChanged = (user.food_name || '').trim() !== (ai.food_name || '').trim()
    const material =
      nameChanged ||
      caloriesShift > MATERIAL_CALORIE_DELTA ||
      proteinShift > MATERIAL_MACRO_DELTA ||
      carbsShift > MATERIAL_MACRO_DELTA ||
      fatShift > MATERIAL_MACRO_DELTA
    if (!material) return

    const payload = {
      source: source || null,
      ai_food_name: ai.food_name || null,
      ai_description: ai.description || null,
      ai_calories: Number(ai.calories) || null,
      ai_protein: Number(ai.protein_g) || null,
      ai_carbs: Number(ai.carbs_g) || null,
      ai_fat: Number(ai.fat_g) || null,
      user_food_name: user.food_name || null,
      user_calories: Number(user.calories) || null,
      user_protein: Number(user.protein) || null,
      user_carbs: Number(user.carbs) || null,
      user_fat: Number(user.fat) || null,
    }
    const { error } = await supabase.from('ai_corrections').insert(payload)
    if (error) {
      // Most likely cause: the migration hasn't been run. Swallow so
      // saving the food log itself still succeeds.
      // eslint-disable-next-line no-console
      console.warn('[ai_corrections] save failed:', error.message)
    }
  }, [])

  return { findSimilar, saveCorrection }
}
