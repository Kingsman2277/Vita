// Vercel serverless function — proxies OpenAI Chat Completions calls.
// The OPENAI_API_KEY env var (no VITE_ prefix) stays server-side only.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'OpenAI API key not configured on server',
      details: 'Add OPENAI_API_KEY in Vercel → Project Settings → Environment Variables, then redeploy.',
    })
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    })

    const data = await response.json()

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('OpenAI API error:', JSON.stringify(data))
      return res.status(response.status).json(data)
    }

    return res.status(200).json(data)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Proxy error:', err.message)
    return res.status(500).json({ error: 'Failed to call OpenAI API', details: err.message })
  }
}
