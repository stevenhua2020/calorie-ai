const OPENAI_API = 'https://api.openai.com/v1/chat/completions'

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

export function getApiKey() {
  return localStorage.getItem('openai_key')
}

export function saveApiKey(key) {
  localStorage.setItem('openai_key', key)
}

export async function analyzeFood({ text, imageBase64, imageType }) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('No OpenAI API key set — check Settings')

  let userContent

  if (imageBase64) {
    userContent = [
      {
        type: 'image_url',
        image_url: {
          url: `data:${imageType || 'image/jpeg'};base64,${imageBase64}`,
          detail: 'high',
        },
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

  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || `OpenAI API error ${res.status}`)
  }

  const data = await res.json()
  const raw = data.choices[0].message.content
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
