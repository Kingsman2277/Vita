const CACHE_NAME = 'vita-v21'
const STATIC_ASSETS = [
  '/',
  '/index.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  // Activate immediately — don't wait for old tabs to close.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Purge ALL caches that don't match the current version.
  // This forces a fresh fetch on the next navigation, which picks up
  // Vite's new hashed bundles after a deploy.
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Only cache GET requests. POST/PUT/DELETE (e.g. /api/gemini)
  // always go straight to the network.
  if (event.request.method !== 'GET') return

  // Never cache API routes — they must always hit the server.
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses.
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
