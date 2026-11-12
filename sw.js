/* Service worker de Mi Agenda: funciona sin internet. */
const VERSION = 'mi-agenda-v1';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mismoOrigen = url.origin === self.location.origin;
  const fuentes = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!mismoOrigen && !fuentes) return;

  // Páginas: red primero (para recibir actualizaciones), caché si no hay internet.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((r) => { const copia = r.clone(); caches.open(VERSION).then((c) => c.put('./index.html', copia)); return r; })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }
  // Resto (íconos, fuentes): caché primero.
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); }
      return r;
    }).catch(() => hit))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    if (cs.length) return cs[0].focus();
    return self.clients.openWindow('./index.html');
  }));
});
