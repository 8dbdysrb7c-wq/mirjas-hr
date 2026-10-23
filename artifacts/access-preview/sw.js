self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map(name => caches.delete(name)));
    })
    .then(() => {
      self.registration.unregister();
    })
    .then(() => self.clients.claim())
  );
});
