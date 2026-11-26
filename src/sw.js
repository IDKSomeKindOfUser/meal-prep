// The build replaces both constants, see scripts/offline.mjs.
const VERSION = '__VERSION__'
const FILES = __FILES__

const CACHE = `menu-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const old = (await caches.keys()).filter((name) => name.startsWith('menu-') && name !== CACHE)
    await Promise.all(old.map((name) => caches.delete(name)))
    await self.clients.claim()
  })())
})

self.addEventListener('message', (event) => {
  if (event.data === 'update') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    // Servers answer with `Vary: Origin`, but module scripts are requested with another origin header than `addAll` sends.
    const found = await cache.match(request.mode === 'navigate' ? '/index.html' : request, { ignoreSearch: true, ignoreVary: true })
    return found ?? fetch(request)
  })())
})
