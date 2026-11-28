const CACHE = 'erpgo-f6552a61b50a-v8';
const SHELL = ['./', './index.html', './css/app.css?v=8', './css/auth.css?v=8', './js/app.js?v=8', './js/pwa.js?v=8', './manifest.webmanifest', './assets/icons/icon-192.png', './assets/icons/icon-512.png', './assets/icons/maskable-512.png', './assets/icons/favicon.ico', './assets/icons/icon-32.png', './assets/icons/icon-180.png', './assets/logo.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('erpgo-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin || !request.url.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
  } else {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
  }
});
