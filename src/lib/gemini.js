// All Gemini calls go through /api/gemini serverless function
// so the API key never reaches the browser

const GEMINI_PROXY = '/api/gemini'

function parseGeminiJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse Gemini response')
  return JSON.parse(jsonMatch[0])
}

async function callGemini(contents) {
  let response
  try {
    response = await fetch(GEMINI_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
    })
  } catch (networkErr) {
    console.error('Network error calling Gemini proxy:', networkErr)
    throw new Error('Network error — check your connection')
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error('Gemini proxy error:', response.status, err)
    throw new Error(err.error?.message || `Gemini API error (${response.status})`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!text) {
    console.error('Empty Gemini response:', JSON.stringify(data))
    throw new Error('Empty response from Gemini')
  }

  return parseGeminiJSON(text)
}

/**
 * Analyze a food photo with Gemini Vision.
 */
export async function analyzeFood(imageBase64) {
  return callGemini([{
    parts: [
      { text: `Analyze this food photo. Return JSON only:
{"food_name": "short dish name (2-4 words max)", "description": "detailed list of items with portions", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "meal_type_guess": "breakfast|lunch|dinner|snack", "confidence": number}

Rules:
- food_name: 2-4 words MAX (e.g. "Breakfast Plate", "Chicken Salad", "Burger & Fries")
- description: full breakdown with portions (e.g. "2 fried eggs, 2 slices bacon, hash browns, toast with butter")
- Be realistic about portion sizes` },
      { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
    ],
  }])
}

/**
 * Analyze a text description of food with Gemini.
 */
export async function analyzeFoodText(description) {
  return callGemini([{
    parts: [{
      text: `I ate the following meal: "${description}"

Calculate the total combined nutrition for everything listed. Be realistic with standard portion sizes. Return JSON only, no other text:
{"food_name": "short dish name (2-4 words max)", "description": "clean detailed list of items", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "meal_type_guess": "breakfast|lunch|dinner|snack"}

Rules:
- Combine ALL items into one total (not per-item)
- Use typical serving sizes (1 medium apple, 8oz coffee, standard egg, etc.)
- Round calories to nearest 5, macros to nearest 1
- food_name: 2-4 words MAX. General dish category like "Breakfast Plate", "Smoothie Bowl", "Mixed Meal"
- description: clean readable list of what was eaten (e.g. "2 eggs, 2 parathas, 1 apple, orange juice, coffee")
- Guess meal_type based on the foods and current time of day`
    }],
  }])
}
