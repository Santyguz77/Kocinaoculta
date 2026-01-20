const CACHE_NAME = 'restaurante-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/Menu.html',
  '/meseros.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/image.png'
];

// Instalación del service worker
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Guardando archivos en caché...');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('[SW] Error al cachear archivos:', err);
          // Continuar de todos modos
        });
      })
      .then(() => {
        console.log('[SW] Service Worker instalado, activando...');
        return self.skipWaiting();
      })
  );
});

// Activación y limpieza de caché antiguo
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia: Network First, fallback a Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clonar respuesta para guardar en caché
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar desde caché
        return caches.match(event.request);
      })
  );
});
