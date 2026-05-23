const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are a precise nutrition analyst. When given a food description or image, respond ONLY with a JSON object (no markdown, no backticks, no explanation) in this exact format:
{
  "foods": [
    {
      "name": "Food name",
      "portion": "estimated portion size",
      "calories": 320,
      "protein": 12,
      "carbs": 45,
      "fat": 8,
      "fiber": 3,
      "confidence": "high|medium|low"
    }
  ],
  "totalCalories": 320,
  "totalProtein": 12,
  "totalCarbs": 45,
  "totalFat": 8,
  "totalFiber": 3,
  "notes": "brief note about the estimate"
}
All macros in grams. Calories as kcal integer. Be realistic with portion estimates. If you cannot identify the food, still return valid JSON with confidence "low".`

export async function analyzeFood({ text, imageBase64, imageType }) {
  let userContent

  if (imageBase64) {
    userContent = [
      {
        type: 'image',
        source: { type: 'base64', media_type: imageType || 'image/jpeg', data: imageBase64 },
      },
      {
        type: 'text',
        text: text
          ? `Analyze the food in this image. Additional context: ${text}`
          : 'Analyze all food items visible in this image and estimate calories and macros.',
      },
    ]
  } else {
    userContent = `Analyze this food and estimate calories and macros: ${text}`
  }

  const res = await fetch(ANTHROPIC_API, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `Claude API error ${res.status}`)
  }

  const data = await res.json()
  const raw = data.content.map(b => b.text || '').join('')
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
