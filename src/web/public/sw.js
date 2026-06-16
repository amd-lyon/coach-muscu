// Service worker minimal : cache l'app pour un usage hors-ligne.
// - Même origine (HTML, JS, CSS, icônes) : stale-while-revalidate.
// - Images Wikimedia : cache-first (conservées après la première visite).
const APP_CACHE = 'coach-muscu-app-v1'
const IMG_CACHE = 'coach-muscu-img-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(APP_CACHE).then(async (cache) => {
        const cached = await cache.match(req)
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone())
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
    return
  }

  if (url.hostname.endsWith('wikimedia.org')) {
    event.respondWith(
      caches.open(IMG_CACHE).then(async (cache) => {
        const cached = await cache.match(req)
        if (cached) return cached
        try {
          const res = await fetch(req)
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone())
          return res
        } catch {
          return cached || Response.error()
        }
      }),
    )
  }
})
