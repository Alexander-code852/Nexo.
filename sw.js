const CACHE_NAME = 'nexo-v1';
const DYNAMIC_CACHE = 'nexo-dynamic-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/producto.html',
  '/style.css',
  '/script.js',
  '/datos.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Devuelve la respuesta en caché si la encuentra
        if (cachedResponse) {
          return cachedResponse;
        }

        // Si no está en caché, va a la red
        return fetch(event.request).then(networkResponse => {
          // Si es una imagen de Unsplash, la cacheamos dinámicamente para usos futuros
          if (event.request.url.includes('images.unsplash.com')) {
            const clonedResponse = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, clonedResponse);
            });
          }
          return networkResponse;
        });
      })
  );
});