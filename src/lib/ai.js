// All AI calls go through /api/openai serverless function
// so the API key never reaches the browser.
//
// Accuracy design notes:
//   - response_format json_schema (strict mode) forces the model to
//     emit valid JSON matching the shape below, so we don't parse
//     free-form text with a regex.
//   - Low temperature (0.2) makes nutrition estimates reproducible.
//   - We ask for a per-item breakdown alongside totals so we can
//     check internal consistency (calories ≈ 4P + 4C + 9F) after
//     parsing, and so the UI can show the user how the AI got there.
//
// Provider: OpenAI GPT-4o (multimodal).

import { supabase } from './supabase'

const AI_PROXY = '/api/openai'
const MODEL = 'gpt-4o'

// OpenAI strict-mode JSON schema rules:
//  - every property listed under `properties` must also be in `required`
//  - every object must set `additionalProperties: false`
// Optional-feeling fields (confidence, items, micronutrients) are kept
// required; the model returns sensible defaults when uncertain.

const ITEM_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { type: 'string' },
    portion: { type: 'string', description: 'e.g. "1 medium", "1 cup", "3 oz"' },
    calories: { type: 'number' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
  },
  required: ['name', 'portion', 'calories', 'protein_g', 'carbs_g', 'fat_g'],
}

const MICRONUTRIENTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  description: 'Key micronutrient totals for the whole meal. Estimate from typical USDA values for the identified items.',
  properties: {
    fiber_g: { type: 'number' },
    sugar_g: { type: 'number' },
    sodium_mg: { type: 'number' },
    cholesterol_mg: { type: 'number' },
    saturated_fat_g: { type: 'number' },
    vitamin_a_mcg: { type: 'number' },
    vitamin_c_mg: { type: 'number' },
    vitamin_d_mcg: { type: 'number' },
    calcium_mg: { type: 'number' },
    iron_mg: { type: 'number' },
    potassium_mg: { type: 'number' },
    magnesium_mg: { type: 'number' },
  },
  required: [
    'fiber_g', 'sugar_g', 'sodium_mg', 'cholesterol_mg', 'saturated_fat_g',
    'vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg',
    'calcium_mg', 'iron_mg', 'potassium_mg', 'magnesium_mg',
  ],
}

const NUTRITION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    food_name: { type: 'string', description: '2-4 word dish name, e.g. "Breakfast Plate"' },
    description: { type: 'string', description: 'Clean, human-readable breakdown: "2 fried eggs, 2 slices bacon"' },
    items: { type: 'array', items: ITEM_SCHEMA, description: 'Per-item breakdown for consistency checks' },
    calories: { type: 'number', description: 'Total calories for the whole meal' },
    protein_g: { type: 'number' },
    carbs_g: { type: 'number' },
    fat_g: { type: 'number' },
    micronutrients: MICRONUTRIENTS_SCHEMA,
    meal_type_guess: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
    confidence: { type: 'number', description: '0.0 to 1.0 — how sure you are about the estimate' },
  },
  required: [
    'food_name', 'description', 'items',
    'calories', 'protein_g', 'carbs_g', 'fat_g',
    'micronutrients', 'meal_type_guess', 'confidence',
  ],
}

const REASONING_PREAMBLE = `You are a careful nutrition estimator for a personal health tracker. The user logs what they actually ate — usually home-cooked or casual meals, not restaurant servings. Default to realistic home portions; err low when uncertain.

CRITICAL RULE — NO ADDED ITEMS:
Count ONLY the foods the user explicitly mentioned. Never add sides, drinks, condiments, toppings, or garnishes that are not in the description.
- "a burger" = one burger. NOT a burger with fries. NOT a burger with a drink.
- "chicken and rice" = chicken and rice. NOT chicken, rice, and vegetables.
- "eggs" = eggs. NOT eggs with toast, coffee, or anything else.
- If the user says "onions" as a burger topping, count onions as a topping, NOT a separate side salad.
- Condiments/toppings mentioned BY the user (ketchup, mayo, onions, pickles) should be included but kept minimal (< 20 cal total unless specified).
If the description is vague (e.g. just "lunch"), say so via low confidence rather than inventing a balanced meal.

Method — follow every time:
1. Parse the description word by word. Count nouns that represent items. Count quantity modifiers literally.
2. Write down your item list. Re-read the description. If any item on your list isn't explicitly in the description, remove it.
3. For each remaining item, pick a portion using the defaults below unless the user specified otherwise.
4. Compute per-item calories and macros from typical values.
5. Sum items → totals. Verify calories ≈ 4·protein_g + 4·carbs_g + 9·fat_g; adjust if drift is material.
6. Round calories to nearest 5, macros to nearest 1.

Portion defaults (use unless the user overrides):
- Burger patty (homemade / smash): THIN, 2–3 oz cooked (~180 cal, 18 g P, 0 C, 11 g F)
- Burger patty (restaurant / thick): 4–5 oz cooked (~330 cal, 28 g P, 0 C, 22 g F)
- Burger bun: 1 standard soft bun (~150 cal, 5 g P, 26 g C, 3 g F)
- Side of fries (home portion, unspecified): ~4 oz cooked (~320 cal, 4 g P, 42 g C, 15 g F)
- Side of fries (restaurant "large"): ~6 oz (~500 cal, 6 g P, 65 g C, 24 g F)
- Scrambled / fried egg: 1 large (~75 cal, 6 g P, 0.5 C, 5 g F)
- Slice of toast + butter: 1 slice bread + 1 tsp butter (~110 cal, 3 g P, 13 g C, 4 g F)
- Coffee (black / milk dash): 8 oz (~5–15 cal)
- Typical fruit piece: 1 medium (apple ~95 cal, banana ~105, orange ~65)

Descriptor cues — interpret literally and conservatively:
- "homemade" = home-kitchen portion, NEVER restaurant-sized. Burger patties are thinner. Sides are moderate.
- "smash burger" = thin patty (2–3 oz each), not thick. One "smash burger" = 1 thin patty.
- "double-stack" / "double patty" = 2 patties on that burger. NOT two burgers. Bun count stays 1 per burger.
- "two burgers" = 2 buns. Multiply patty count by per-burger patties. So "two double-stacked homemade smash burgers" = 2 buns + 4 thin smash patties.
- "small" / "light" / "just a little" = 0.6–0.8× the default portion.
- "large" / "huge" / "extra" = 1.3–1.6× the default. "Restaurant-sized" = 1.5–2×.
- "a side of X" with no size hint → home portion default, not large.
- Condiments (ketchup, mustard, onion, pickles) add < 20 cal total; don't inflate them.

When ambiguous, pick the lower estimate and drop confidence accordingly. Do not pad portions "to be safe" — the user will manually bump them if off.

Micronutrients: estimate fiber, sugar, sodium, cholesterol, saturated fat, vitamins A/C/D, calcium, iron, potassium, and magnesium. Use typical USDA values for each identified item and sum them. These are estimates — round to whole numbers. If you don't know a value for some item, contribute 0 from it rather than guessing wildly.

The schema requires every field to be present. For optional-feeling fields:
- If the items array would be empty (vague input), still return at least one synthesized item describing what you assumed.
- For confidence, use 0.0–1.0 — be honest, low values are useful signal.`

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

async function callOpenAI(userContent) {
  // Forward the user's Supabase access token so the proxy can
  // verify the caller's identity and check their feature gate.
  // Refreshes silently if the cached token is near expiry.
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    throw new Error('Not signed in — log out and back in, then try again')
  }

  let response
  try {
    response = await fetch(AI_PROXY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: userContent,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'nutrition_analysis',
            strict: true,
            schema: NUTRITION_SCHEMA,
          },
        },
      }),
    })
  } catch (networkErr) {
    // eslint-disable-next-line no-console
    console.error('Network error calling AI proxy:', networkErr)
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
    // eslint-disable-next-line no-console
    console.error('[openai] proxy error', { status: response.status, url: response.url, detail, parsed })
    const headline =
      response.status === 404
        ? 'AI service not reachable (404). Reload the page — if it persists the /api/openai proxy may be down.'
        : response.status === 401
        ? 'Sign-in expired. Reload the page and try again.'
        : response.status === 403
        ? 'AI food analysis isn’t enabled on your account. Ask the admin to turn it on.'
        : response.status === 429
        ? 'Slow down — too many AI requests this minute. Try again shortly.'
        : `AI error (${response.status})`
    throw new Error(detail ? `${headline} — ${detail}` : headline)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || ''

  if (!text) {
    // eslint-disable-next-line no-console
    console.error('Empty OpenAI response:', JSON.stringify(data))
    const refusal = data.choices?.[0]?.message?.refusal
    const finish = data.choices?.[0]?.finish_reason
    if (refusal) throw new Error(`AI refused: ${refusal}`)
    if (finish === 'content_filter') throw new Error('AI blocked the response (content_filter)')
    throw new Error('Empty response from AI')
  }

  // With response_format json_schema (strict), `text` is valid JSON.
  let result
  try {
    result = JSON.parse(text)
  } catch (err) {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      // eslint-disable-next-line no-console
      console.error('[openai] unparseable output:', text.slice(0, 500))
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
    console.info('[openai] calorie/macro mismatch — reconciling', {
      reportedCals, atwater, drift, tolerance,
    })
    reconciled.calories = Math.round(atwater / 5) * 5
    reconciled._reconciled = { fromCalories: reportedCals, toCalories: reconciled.calories }
  }
  return reconciled
}

/**
 * Analyze a food photo with GPT-4o vision.
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

  // OpenAI multimodal: content array with text parts and image_url parts.
  // image_url accepts data URIs directly.
  return callOpenAI([
    { type: 'text', text: prompt },
    {
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${imageBase64}`,
        // 'high' uses the full image at higher cost; 'low' is faster and ~85% cheaper.
        // For food portions you want detail, so 'high' is correct here.
        detail: 'high',
      },
    },
  ])
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

  return callOpenAI([{ type: 'text', text: prompt }])
}
