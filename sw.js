// FlowPDV Mobile Service Worker v2.2.22 - Ultra-Fast PWA
const CACHE_NAME = 'flowpdv-mobile-v20260923-interface';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './reconstruction.css',
  './style.css',
  './app.js',
  './caixa-rules.js',
  './report-rules.js',
  './manifest.json',
  './logos/FlowPDV-icone-claro.png',
  './logos/FlowPDV-icone-escuro.png',
  './logos/FlowPDV-vertical-escuro.png',
  './logos/FlowPDV-horizontal-escuro.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key.startsWith('flowpdv-mobile-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  // Ignora chamadas do Firebase Firestore e Google APIs para dados sempre em tempo real
  if (
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis.com') ||
    event.request.url.includes('google.com')
  ) {
    return;
  }

  // Prioriza versão atual; usa cache apenas quando a rede falhar.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return fetchPromise;
    })
  );
});
