const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export async function analyzeFood(imageBase64) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: 'Analyze this food photo. Return JSON only: {"food_name": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "meal_type_guess": "breakfast|lunch|dinner|snack", "confidence": number}. Be realistic about portion size.',
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    }
  )

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse Gemini response')

  return JSON.parse(jsonMatch[0])
}
