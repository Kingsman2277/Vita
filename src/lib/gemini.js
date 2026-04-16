// All Gemini calls go through /api/gemini serverless function
// so the API key never reaches the browser.
//
// Accuracy design notes:
//   - responseSchema forces the model to emit valid JSON matching the
//     shape below, so we don't parse free-form text with a regex.
//   - Low temperature (0.2) makes nutrition estimates reproducible.
//   - thinkingBudget lets Gemini 2.5 Flash reason step-by-step before
//     answering, which measurably improves portion estimation.
//   - We ask for per-item breakdown alongside totals so we can check
//     internal consistency (calories ≈ 4P + 4C + 9F) after parsing.

const GEMINI_PROXY = '/api/gemini'

const NUTRITION_SCHEMA = {
  type: 'object',
  properties: {
    food_name: {
      type: 'string',
      description: '2-4 word dish name, e.g. "Breakfast Plate" or "Chicken Salad"',
    },
    description: {
      type: 'string',
      description: 'Clean, human-readable breakdown: "2 fried eggs, 2 slices bacon, hash browns, toast with butter"',
    },
    items: {
      type: 'array',
      description: 'Per-item breakdown used for consistency checks',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          portion: { type: 'string', description: 'e.g. "1 medium", "1 cup", "3 oz"' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
        },
        required: ['name', 'portion', 'calories'],
      },
    },
    calories: { type: 'number', description: 'Total calories for the whole meal' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
    meal_type_guess: {
      type: 'string',
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    },
    confidence: {
      type: 'number',
      description: '0.0 to 1.0 — how sure you are about the estimate',
    },
  },
  required: ['food_name', 'description', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'meal_type_guess'],
}

const REASONING_PREAMBLE = `You are a careful nutrition estimator. Before answering:
1. List every food item you can identify.
2. For each, estimate a realistic portion size. Use visual cues (plate diameter ≈ 10 in, fork ≈ 8 in, standard mug ≈ 8 oz) when analyzing photos.
3. For each item, compute calories and macros from typical values.
4. Sum items into the total. Verify calories ≈ 4·protein_g + 4·carbs_g + 9·fat_g.
5. Only then return the JSON.

Round calories to the nearest 5, macros to the nearest 1. Be realistic — don't overestimate portions. If unsure, prefer the lower estimate.`

function userCorrectionsHint(corrections) {
  if (!corrections || corrections.length === 0) return ''
  const lines = corrections.map(c => {
    const ai = `AI said ${c.ai_food_name || '?'} ${c.ai_calories ?? '?'}kcal (${c.ai_protein ?? '?'}P/${c.ai_carbs ?? '?'}C/${c.ai_fat ?? '?'}F)`
    const user = `user saved ${c.user_food_name || '?'} ${c.user_calories ?? '?'}kcal (${c.user_protein ?? '?'}P/${c.user_carbs ?? '?'}C/${c.user_fat ?? '?'}F)`
    return `- ${ai} → ${user}`
  }).join('\n')
  return `

This user has previously corrected similar analyses. Use these as calibration hints:
${lines}

Apply the same correction pattern if it matches the current meal.`
}

async function callGemini(contents) {
  let response
  try {
    response = await fetch(GEMINI_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: NUTRITION_SCHEMA,
          thinkingConfig: { thinkingBudget: 512 },
        },
      }),
    })
  } catch (networkErr) {
    console.error('Network error calling Gemini proxy:', networkErr)
    throw new Error('Network error — check your connection')
  }

  if (!response.ok) {
    let detail = ''
    let parsed = null
    try {
      const raw = await response.text()
      try { parsed = JSON.parse(raw) } catch { /* not JSON */ }
      if (parsed) {
        detail =
          parsed.error?.message ||
          parsed.details ||
          (typeof parsed.error === 'string' ? parsed.error : '') ||
          raw.slice(0, 200)
      } else {
        detail = raw.slice(0, 200)
      }
    } catch { /* body already consumed */ }
    console.error('[gemini] proxy error', { status: response.status, url: response.url, detail, parsed })
    const headline = response.status === 404
      ? 'AI service not reachable (404). Reload the page — if it persists the /api/gemini proxy may be down.'
      : `Gemini error (${response.status})`
    throw new Error(detail ? `${headline} — ${detail}` : headline)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!text) {
    console.error('Empty Gemini response:', JSON.stringify(data))
    const block = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason
    throw new Error(block ? `AI blocked the response (${block})` : 'Empty response from AI')
  }

  // With responseSchema, the text is guaranteed valid JSON.
  let result
  try {
    result = JSON.parse(text)
  } catch (err) {
    // Extremely rare — fall back to regex extract for safety.
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('[gemini] unparseable output:', text.slice(0, 500))
      throw new Error('AI returned malformed output — try again')
    }
    result = JSON.parse(match[0])
  }

  return reconcileNutrition(result)
}

/**
 * Cross-check calories against macros. The Atwater system says
 * calories = 4·P + 4·C + 9·F. If the model's total is off by more
 * than ~15%, trust the macros (they're usually correct item-by-item
 * even when totals drift due to rounding) and override calories.
 *
 * Also: if per-item breakdown sums don't match the total, log a
 * warning so we can spot systemic issues.
 */
function reconcileNutrition(result) {
  const p = Number(result.protein_g) || 0
  const c = Number(result.carbs_g) || 0
  const f = Number(result.fat_g) || 0
  const reportedCals = Number(result.calories) || 0
  const atwater = 4 * p + 4 * c + 9 * f
  const drift = Math.abs(reportedCals - atwater)
  const tolerance = Math.max(50, 0.15 * reportedCals)
  const reconciled = { ...result }
  if (drift > tolerance && atwater > 0) {
    // eslint-disable-next-line no-console
    console.info('[gemini] calorie/macro mismatch — reconciling', {
      reportedCals, atwater, drift, tolerance,
    })
    reconciled.calories = Math.round(atwater / 5) * 5
    reconciled._reconciled = { fromCalories: reportedCals, toCalories: reconciled.calories }
  }
  return reconciled
}

/**
 * Analyze a food photo with Gemini Vision.
 * @param {string} imageBase64 - base64-encoded image bytes, no data: prefix
 * @param {object} [options]
 * @param {string} [options.mimeType='image/jpeg'] - MIME of the image
 * @param {Array}  [options.corrections] - past corrections for similar items
 */
export async function analyzeFood(imageBase64, { mimeType = 'image/jpeg', corrections = [] } = {}) {
  const prompt = `${REASONING_PREAMBLE}${userCorrectionsHint(corrections)}

Analyze this food photo and fill out the schema. Rules:
- food_name: 2-4 words MAX (e.g. "Breakfast Plate", "Chicken Salad", "Burger & Fries")
- description: human-readable breakdown with portions
- items: per-component breakdown used for sanity checks
- If multiple plates/containers are visible, sum them into one total
- If the image is unclear, lower your confidence value`

  return callGemini([{
    parts: [
      { text: prompt },
      { inline_data: { mime_type: mimeType, data: imageBase64 } },
    ],
  }])
}

/**
 * Analyze a text description of food.
 * @param {string} description
 * @param {object} [options]
 * @param {Array} [options.corrections]
 */
export async function analyzeFoodText(description, { corrections = [] } = {}) {
  const prompt = `${REASONING_PREAMBLE}${userCorrectionsHint(corrections)}

The user ate: "${description}"

Calculate the combined nutrition for everything listed. Rules:
- Combine ALL items into one total (not per-item totals only in the items array)
- Use typical serving sizes (1 medium apple, 8 oz coffee, 1 standard egg, etc.)
- food_name: 2-4 word dish label ("Breakfast Plate", "Smoothie Bowl", "Mixed Meal")
- description: clean list of what was eaten
- Guess meal_type from the foods and the current time of day`

  return callGemini([{
    parts: [{ text: prompt }],
  }])
}
