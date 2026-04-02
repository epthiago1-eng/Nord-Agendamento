self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', async () => {
  const registration = await self.registration;
  await registration.unregister();
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.navigate(client.url));
});
