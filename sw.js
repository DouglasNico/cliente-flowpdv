// FlowPDV Mobile Service Worker v1.0.1
const CACHE_NAME = 'flowpdv-mobile-v1.0.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.png',
  './logoflow.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignora esquemas não-HTTP (extensões do navegador, etc)
  if (!event.request.url.startsWith('http')) return;

  // Ignora requisições do Firebase e APIs externas para sempre buscar dados frescos
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebase') || event.request.url.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
