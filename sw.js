/* ============================================================
   LIBRE TECH — Service Worker (sw.js)
   Cache-first for static assets, network-first for API calls
   ============================================================ */

// Subir la versión invalida el caché anterior tras cada despliegue
const CACHE_NAME = 'libretech-v7';
// Caché aparte para las fotos: se limpia por tamaño, no por versión
const IMAGE_CACHE = 'libretech-images-v1';
const IMAGE_CACHE_LIMIT = 150;
const STATIC_ASSETS = [
  '/index.html',
  '/producto.html',
  '/css/styles.css',
  '/js/business-config.js',
  '/js/colombia-locations.js',
  '/js/app.js',
  '/js/cart.js',
  '/js/auth.js',
  '/js/shipping.js',
  '/js/gifts.js',
  '/js/share.js',
  '/js/whatsapp-bubble.js',
  '/js/hamburger-menu.js',
  '/js/product-detail.js',
  '/js/supabase-client.js',
  '/nuevos%20logos/JPG/Isotipo/1.jpg',
  '/manifest.json'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        // La caché de fotos sobrevive a los despliegues: se limpia por tamaño
        keys
          .filter(key => key !== CACHE_NAME && key !== IMAGE_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Fotos de producto (Supabase Storage): stale-while-revalidate.
  // Son inmutables por URL, así que servirlas desde caché hace que volver
  // a la tienda o navegar entre páginas muestre las imágenes al instante.
  if (isProductImage(url)) {
    event.respondWith(handleImageRequest(event.request));
    return;
  }

  // Skip cross-origin requests (Supabase, Google Fonts, CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // For navigation requests (HTML pages), use network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for same-origin static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Return cached, update in background
        fetch(event.request).then(response => {
          if (response && response.ok && response.type === 'basic') {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});

/* ------------------------------------------------------------------
   Imágenes de producto
------------------------------------------------------------------ */
function isProductImage(url) {
  return url.hostname.endsWith('.supabase.co') && url.pathname.includes('/storage/v1/object/');
}

async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request).then(response => {
    // Las respuestas opacas (sin CORS) también sirven para pintar la imagen
    if (response && (response.ok || response.type === 'opaque')) {
      cache.put(request, response.clone()).then(() => trimImageCache(cache));
    }
    return response;
  }).catch(() => cached);

  return cached || network;
}

/** Mantiene la caché de imágenes acotada (FIFO por orden de inserción). */
async function trimImageCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= IMAGE_CACHE_LIMIT) return;
  const excess = keys.length - IMAGE_CACHE_LIMIT;
  for (let i = 0; i < excess; i++) await cache.delete(keys[i]);
}
