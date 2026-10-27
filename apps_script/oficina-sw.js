// Service worker de la oficina (Base Antártica): permite instalarla y abrirla sin conexión con los últimos datos que
// guardó la página. Solo atiende oficina.html y sus archivos; los datos (script.google.com) siempre van a la red.
const CACHE = 'base-antartica-v1';
const ARCHIVOS = ['oficina.html', 'oficina.webmanifest', 'img/oficina/icono.svg', 'img/oficina/icono-192.png', 'img/oficina/icono-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('base-antartica-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Primero la red (para recibir siempre la versión nueva); sin conexión, la copia guardada
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('oficina.html'))));
});
