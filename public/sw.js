const STATIC_CACHE = 'hf-static-v1';
const OFFLINE_CACHE = 'hf-offline-v1';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, OFFLINE_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => !currentCaches.includes(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // HN Firebase API: network-only (real-time data, never cache)
  if (url.hostname === 'hacker-news.firebaseio.com') return;

  // Static assets: cache-first, populate on miss
  // Safe because Vite outputs content-hashed filenames
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    /\.(png|ico|svg|woff2|webp|jpg|jpeg)$/.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok && response.type !== 'opaque') {
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation: network-first, fall back to cached '/' offline shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL, { cacheName: OFFLINE_CACHE })
      )
    );
    return;
  }
});
