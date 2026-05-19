// Vercel serverless function — proxies OpenAI Chat Completions calls.
//
// Security model:
//   1. Origin allowlist — CORS only sends the ACAO header back for
//      vita.shippedforyou.com, localhost, and *.vercel.app previews.
//      Other origins get no CORS headers; browsers block the response.
//   2. JWT validation — every request must include a valid Supabase
//      access token in the Authorization header. We hand that token
//      to the Supabase JS client to resolve auth.uid().
//   3. Feature gate — the calling user must have either is_admin()
//      OR ai_food_analysis in their enabled_features. Checked
//      server-side via RLS-scoped queries.
//   4. Per-user rate limit — in-memory map (~20 req/min/user). Resets
//      on cold start, which is fine for casual abuse prevention.
//   5. OPENAI_API_KEY stays server-side. Never echoed to the client.

import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

// ─── CORS allowlist ──────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://vita.shippedforyou.com',
  'http://localhost:5173',
  'http://localhost:4173',
])
function resolveOrigin(req) {
  const origin = req.headers.origin || ''
  if (ALLOWED_ORIGINS.has(origin)) return origin
  // Vercel preview deploys end in .vercel.app
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return origin
  return null
}

// ─── In-memory per-user rate limit (best-effort, warm-instance only) ─
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 20
const rateLimitStore = new Map()
function checkRateLimit(userId) {
  const now = Date.now()
  const cutoff = now - RATE_LIMIT_WINDOW_MS
  const recent = (rateLimitStore.get(userId) || []).filter(ts => ts > cutoff)
  if (recent.length >= RATE_LIMIT_MAX) return false
  recent.push(now)
  rateLimitStore.set(userId, recent)
  // Bound memory: forget users older than the window if their list is empty.
  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore) {
      if (v.length === 0 || v[v.length - 1] < cutoff) rateLimitStore.delete(k)
    }
  }
  return true
}

export default async function handler(req, res) {
  // ─── CORS handling ────────────────────────────────────────────────
  const origin = resolveOrigin(req)
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ─── Server config ────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'OpenAI API key not configured on server',
      details: 'Add OPENAI_API_KEY in Vercel → Settings → Environment Variables, then redeploy.',
    })
  }
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'Supabase env vars missing on server',
      details: 'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in Vercel.',
    })
  }

  // ─── Auth: validate the caller's Supabase JWT ─────────────────────
  const authHeader = req.headers.authorization || ''
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' })
  }
  const jwt = authHeader.slice(7).trim()

  // Build a Supabase client scoped to this user. RLS will apply.
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired auth token' })
  }
  const userId = userData.user.id

  // ─── Authorization: admin OR has ai_food_analysis feature ────────
  let authorized = false

  // Admin bypass first — cheap RPC.
  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (isAdmin === true) {
    authorized = true
  } else {
    // RLS lets users read their own profile row.
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('enabled_features')
      .eq('user_id', userId)
      .maybeSingle()
    if (Array.isArray(profile?.enabled_features) && profile.enabled_features.includes('ai_food_analysis')) {
      authorized = true
    }
  }

  if (!authorized) {
    return res.status(403).json({
      error: 'AI food analysis is not enabled on your account. Ask the admin to enable it.',
    })
  }

  // ─── Rate limit ───────────────────────────────────────────────────
  if (!checkRateLimit(userId)) {
    return res.status(429).json({
      error: 'Slow down — too many AI requests this minute. Try again shortly.',
    })
  }

  // ─── Forward to OpenAI ────────────────────────────────────────────
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
