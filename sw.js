/* ============================================================
   LIBRE TECH — Service Worker (sw.js)
   Cache-first for static assets, network-first for API calls
   ============================================================ */

const CACHE_NAME = 'libretech-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/producto.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/cart.js',
  '/js/auth.js',
  '/js/product-detail.js',
  '/js/supabase-client.js',
  '/LOGO_LIBRETECH.png',
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
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API/Supabase, cache-first for static assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Network-first for Supabase API and external resources
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    event.respondWith(
      fetch(event.request).then(response => {
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Return cached, but also fetch fresh copy in background
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          }
        }).catch(() => {});
        return cached;
      }
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      });
    })
  );
});
