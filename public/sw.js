// ─── Kynthai Push Notification Service Worker ───────────────────────────
// Handles:
//  - Push events → shows browser notifications
//  - Notification click → opens/focuses the relevant portal tab
//  - Push subscription lifecycle
// ──────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-restricted-globals
const sw = self;

sw.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Kynthai', body: event.data.text() };
  }

  const title = payload.title || 'Kynthai';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'kynthai-notification',
    data: payload.data || {},
    actions: payload.actions || [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(sw.registration.showNotification(title, options));
});

sw.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || data.tab || '/';

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        // Focus an existing Kynthai window if available
        for (const client of clients) {
          if (client.url.includes(sw.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Otherwise open a new window
        return sw.clients.openWindow(url);
      })
  );
});

// Allow the app to send messages to control notification behaviour
sw.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'dismiss-notification') {
    sw.registration.getNotifications({ tag: event.data.tag }).then((notifications) => {
      notifications.forEach((n) => n.close());
    });
  }
});
