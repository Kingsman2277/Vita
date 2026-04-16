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
    // Try JSON first — Gemini and our proxy return structured JSON.
    // Fall back to text because Vercel's routing/edge 404s are HTML,
    // which would otherwise collapse into a useless generic message.
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
    } catch {
      // body already consumed or unreadable
    }
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
    // Common cause: safety filter blocked the output.
    const block = data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason
    throw new Error(block ? `AI blocked the response (${block})` : 'Empty response from AI')
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
