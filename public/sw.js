const CACHE = 'vectorvault-v1';

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/vaultlogo.jpeg',
];

// Install: cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API calls: network-only (always fresh)
// - Everything else: network-first, fall back to cache
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET and API/auth routes
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Clone and store in cache
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
