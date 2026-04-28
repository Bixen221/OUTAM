const CACHE_NAME = 'outam-menu-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.startsWith('/menu/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => {
          if (cached) return cached;
          return new Response(
            '<html><body style="font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#FAFAF8;text-align:center;padding:2rem"><div><div style="font-size:3rem;margin-bottom:1rem">📱</div><h2 style="margin-bottom:0.5rem">Mode hors-ligne</h2><p style="color:#888;font-size:0.9rem">Vous etes hors connexion.<br>Reconnectez-vous pour charger le menu.</p></div></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }))
    );
    return;
  }

  if (event.request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || new Response('{"data":[],"error":null}', { headers: { 'Content-Type': 'application/json' } })))
    );
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
