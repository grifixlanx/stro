// Service Worker for Red Sonar App (Background & Cross-device notifications)
const CACHE_NAME = 'red-sonar-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push or postMessage notifications
self.addEventListener('push', (event) => {
  let data = { title: '🔴 RED SONAR SIGNAL', body: 'A friend pinged you on Red Sonar!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Friend is calling you on Red Sonar!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [300, 100, 300, 100, 500],
    tag: 'red-sonar-alert',
    renotify: true,
    requireInteraction: true,
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🔴 RED SONAR ALERT', options)
  );
});

// Click notification to focus or startup app when signal received
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and tell it to trigger red sonar
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'SIGNAL_WAKE', data: event.notification.data });
          return client.focus();
        }
      }
      // If no window open, startup the app
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
