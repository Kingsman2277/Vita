const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

function parseGeminiJSON(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse Gemini response')
  return JSON.parse(jsonMatch[0])
}

/**
 * Analyze a food photo with Gemini Vision.
 */
export async function analyzeFood(imageBase64) {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: 'Analyze this food photo. Return JSON only: {"food_name": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "meal_type_guess": "breakfast|lunch|dinner|snack", "confidence": number}. Be realistic about portion size.' },
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
        ],
      }],
    }),
  })

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return parseGeminiJSON(text)
}

/**
 * Analyze a text description of food with Gemini.
 * e.g. "two eggs with two parathas, one apple, orange juice, and a coffee"
 */
export async function analyzeFoodText(description) {
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `I ate the following meal: "${description}"

Calculate the total combined nutrition for everything listed. Be realistic with standard portion sizes. Return JSON only, no other text:
{"food_name": "brief summary of the meal", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "meal_type_guess": "breakfast|lunch|dinner|snack"}

Rules:
- Combine ALL items into one total (not per-item)
- Use typical serving sizes (1 medium apple, 8oz coffee, standard egg, etc.)
- Round calories to nearest 5, macros to nearest 1
- food_name should be a short readable summary like "Eggs, parathas, fruit & coffee"
- Guess meal_type based on the foods and current time of day`
        }],
      }],
    }),
  })

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return parseGeminiJSON(text)
}
