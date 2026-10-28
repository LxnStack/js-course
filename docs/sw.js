/* Service Worker：离线优先，缓存优先 */
const CACHE = 'js-course-v1793117297899';
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/base.css",
  "./assets/app.js",
  "./assets/course-data.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./ch/01.html",
  "./ch/02.html",
  "./ch/03.html",
  "./ch/04.html",
  "./ch/05.html",
  "./ch/06.html",
  "./ch/07.html",
  "./ch/08.html",
  "./ch/09.html",
  "./ch/10.html",
  "./ch/11.html",
  "./ch/12.html",
  "./ch/13.html",
  "./ch/14.html",
  "./ch/15.html",
  "./ch/16.html",
  "./ch/17.html",
  "./ch/18.html",
  "./ch/19.html",
  "./ch/20.html"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
