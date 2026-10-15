self.addEventListener('push', (event) => {
  let mensagem = {};
  try {
    mensagem = event.data?.json() || {};
  } catch {
    mensagem = { body: event.data?.text() || 'Há uma nova atualização no sistema.' };
  }

  event.waitUntil(self.registration.showNotification(
    mensagem.title || 'Capacitação Missionária',
    {
      body: mensagem.body || 'Há uma nova atualização no sistema.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: mensagem.tag || 'pcm-atualizacao',
      data: { url: mensagem.url || '/dashboard' },
    }
  ));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url || '/dashboard', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
    const existente = clientes.find((cliente) => cliente.url.startsWith(self.location.origin));
    if (existente) {
      existente.navigate(destino);
      return existente.focus();
    }
    return self.clients.openWindow(destino);
  }));
});
