/* Service worker minimale: runtime caching (stale-while-revalidate) per far
   funzionare il tool anche offline dopo la prima visita. Nessun manifest di
   build: si adatta ai file con hash generati da Vite. */
const CACHE = 'macbook-tester-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => null);

      return (
        cached ||
        (await network) ||
        (await cache.match('./index.html')) ||
        new Response('Offline', { status: 503, statusText: 'Offline' })
      );
    })(),
  );
});
