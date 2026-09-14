self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data || '/');
      }
    })
  );
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : 'إشعار جديد من نظام ميرجاس' };
  }

  const title = data.title || 'نظام ميرجاس 🔔';
  const options = {
    body: data.body || 'لديك تحديث جديد في النظام',
    icon: '/icon-mrsleep.png',
    badge: '/icon-mrsleep.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    renotify: true,
    tag: data.tag || 'mirjas-push-notification'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
