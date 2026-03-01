
const CACHE_NAME = 'nord-manager-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Nord Barbershop';
  const options = {
    body: data.body || 'Nova notificação',
    icon: 'https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png',
    badge: 'https://agendamento.igic.com.br/assets/logos/nord_barbershop_logo.png',
    data: { url: data.url || '/' }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      if (windowClients.length > 0) {
        windowClients[0].focus();
      } else {
        clients.openWindow(event.notification.data.url);
      }
    })
  );
});
