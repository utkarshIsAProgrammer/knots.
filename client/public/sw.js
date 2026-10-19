// Knots Service Worker for Web Push & Local Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle notification clicks — brings existing tab to focus or opens app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const peer = event.notification.data?.peer;
  const targetUrl = peer ? `/?chat=${encodeURIComponent(peer)}` : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (peer && 'postMessage' in client) {
            client.postMessage({ type: 'OPEN_CHAT', peer });
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
