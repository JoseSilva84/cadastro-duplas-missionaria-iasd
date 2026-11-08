self.addEventListener('push', (event) => {
  let mensagem;
  try {
    mensagem = event.data?.json() || {};
  } catch {
    mensagem = { body: event.data?.text() || 'Há uma nova atualização no sistema.' };
  }

  const tarefas = [self.registration.showNotification(
    mensagem.title || 'Capacitação Missionária',
    {
      body: mensagem.body || 'Há uma nova atualização no sistema.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: mensagem.tag || 'pcm-atualizacao',
      data: { url: mensagem.url || '/dashboard' },
    }
  )];
  const quantidade = Math.max(0, Number(mensagem.unreadCount) || 0);
  if (quantidade > 0 && 'setAppBadge' in navigator) tarefas.push(navigator.setAppBadge(quantidade));
  else if (quantidade === 0 && 'clearAppBadge' in navigator) tarefas.push(navigator.clearAppBadge());
  event.waitUntil(Promise.allSettled(tarefas));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  const destinoResolvido = new URL(url, self.location.origin);
  const destino = destinoResolvido.origin === self.location.origin ? destinoResolvido.href : `${self.location.origin}/dashboard`;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
    const existente = clientes.find((cliente) => cliente.url.startsWith(self.location.origin));
    if (existente) {
      existente.navigate(destino);
      return existente.focus();
    }
    return self.clients.openWindow(destino);
  }));
});
