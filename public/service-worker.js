// Service Worker for handling push notifications
console.log('🔔 Service Worker loaded');

// Handle notification display from Pusher events
self.addEventListener('push', (event) => {
  console.log('🔔 Push event received:', event);
  
  if (!event.data) {
    console.warn('⚠️ Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('🔔 Push data:', data);
    
    const { title = 'Askora', options = {} } = data;
    
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'askora-notification',
        requireInteraction: false,
        ...options,
      })
    );
  } catch (err) {
    console.error('🔔 Error handling push event:', err);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification.title);
  event.notification.close();
  
  // Open/focus the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to find existing app window
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not found
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
});

// Handle notification dismissal
self.addEventListener('notificationclose', (event) => {
  console.log('🔔 Notification closed:', event.notification.title);
});