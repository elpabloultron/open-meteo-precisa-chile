// Service Worker con estrategia Híbrida: Precache de Shell + Stale-While-Revalidate + Offline Fallback
const CACHE_NAME = 'meteo-precisa-v10.9';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css?v=10.9',
  './app.js?v=10.9',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Aviso precache SW:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 1. Manejo de Navegación (HTML): Network-First con fallback a caché de index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./index.html')
            .then((cached) => cached || caches.match('./'))
            .then((res) => res || caches.match(event.request));
        })
    );
    return;
  }

  // 2. Caché de catálogo de estaciones para modo campo offline
  if (url.pathname === '/api/v1/estaciones') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Ignorar otros endpoints dinámicos de API
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 3. Recursos Estáticos y CDN (JS, CSS, Imágenes, Fuentes)
  const isStaticAsset = url.pathname.startsWith('/static/') ||
                        url.pathname.match(/\.(png|webp|svg|css|js|woff2?)$/) ||
                        url.hostname.includes('unpkg.com') ||
                        url.hostname.includes('jsdelivr.net') ||
                        url.hostname.includes('googleapis.com') ||
                        url.hostname.includes('gstatic.com');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              const resClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. Estrategia por defecto: Network-First con fallback a caché
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
