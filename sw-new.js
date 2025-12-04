// Service Worker para Restaurante
const CACHE_NAME = 'restaurante-v2';
const CACHE_VERSION = '2.0.0';

// Archivos esenciales para funcionar offline
const ESSENTIAL_FILES = [
  '/',
  '/selector.html',
  '/index.html',
  '/Menu.html',
  '/meseros.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Archivos opcionales
const OPTIONAL_FILES = [
  '/image.png'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cache abierto, guardando archivos esenciales...');
      return cache.addAll(ESSENTIAL_FILES).catch(err => {
        console.error('[SW] Error al guardar archivos esenciales:', err);
      });
    }).then(() => {
      return caches.open(CACHE_NAME).then(cache => {
        return Promise.all(
          OPTIONAL_FILES.map(url => {
            return cache.add(url).catch(err => {
              console.warn('[SW] No se pudo guardar archivo opcional:', url);
            });
          })
        );
      });
    }).then(() => {
      console.log('[SW] Service Worker instalado correctamente');
      return self.skipWaiting();
    })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker activado');
      return self.clients.claim();
    })
  );
});

// Estrategia: Network First con fallback a Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, guardarla en caché
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, buscar en caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Si no está en caché y es navegación, mostrar página offline
          if (event.request.mode === 'navigate') {
            return caches.match('/selector.html');
          }
        });
      })
  );
});
