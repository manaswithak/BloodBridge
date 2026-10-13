
self.addEventListener('push', (event) => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: 'BloodBridge', body: event.data.text() };
    }
  }

  const title = data.title || 'BloodBridge';
  const options = {
    body: data.body || 'You have a new blood request notification.',
    icon: '/favicon.ico',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
