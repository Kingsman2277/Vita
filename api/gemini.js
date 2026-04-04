// Vercel serverless function — proxies Gemini API calls
// The GEMINI_API_KEY env var (no VITE_ prefix) stays server-side only

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured on server' })
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Gemini API error:', JSON.stringify(data))
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (err) {
    console.error('Proxy error:', err.message)
    return res.status(500).json({ error: 'Failed to call Gemini API', details: err.message })
  }
}
