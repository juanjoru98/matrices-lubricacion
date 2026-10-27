// Service worker: siempre intenta la red primero (datos frescos) y, si no hay señal,
// muestra la última versión guardada en el celular.
const CACHE = 'matrices-v1';
const BASICOS = [
  './', 'index.html', 'css/app.css', 'js/app.js', 'js/util.js', 'js/qr.js', 'js/exportar.js', 'js/cripto.js', 'js/github.js',
  'data/matrices.json', 'data/config.json', 'img/logo-blanco.png', 'img/icono-192.png',
  'fonts/inter-400.woff', 'fonts/inter-500.woff', 'fonts/inter-600.woff', 'fonts/inter-700.woff', 'fonts/interdisplay-700.woff', 'fonts/interdisplay-800.woff',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASICOS)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(r);
      if (res.ok && res.type === 'basic') cache.put(r, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const guardado = await cache.match(r, { ignoreSearch: true });
      if (guardado) return guardado;
      if (r.mode === 'navigate') return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
      return Response.error();
    }
  })());
});
