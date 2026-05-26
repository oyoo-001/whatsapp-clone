const CACHE_NAME = 'wa-clone-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, Vite internals, API, uploads, socket.io, and WebSocket upgrades
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/@')) return;
  if (url.pathname.startsWith('/api')) return;
  if (url.pathname.startsWith('/uploads')) return;
  if (url.pathname.startsWith('/socket.io')) return;
  if (url.pathname.startsWith('/src/')) return;
  if (url.pathname.startsWith('/node_modules/')) return;
  if (url.pathname.endsWith('.hot-update.js') || url.pathname.endsWith('.hot-update.json')) return;

  // Only cache static production assets (not dev HMR)
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('/');
      }
    })
  );
});
