import { registerSW } from 'virtual:pwa-register';

let atualizarServiceWorker = null;

export function iniciarPwa() {
  atualizarServiceWorker = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('pcm:pwa-update'));
    },
    onOfflineReady() {
      window.dispatchEvent(new CustomEvent('pcm:pwa-offline-ready'));
    },
    onRegisterError(erro) {
      console.warn('[PWA] Falha ao registrar o aplicativo.', erro);
    },
  });
}

export function aplicarAtualizacaoPwa() {
  return atualizarServiceWorker?.(true);
}

export function notificacoesDisponiveis() {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'serviceWorker' in navigator;
}

export async function pedirPermissaoNotificacoes() {
  if (!notificacoesDisponiveis()) return 'indisponivel';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

export async function atualizarBadgeAplicativo(quantidade) {
  if (typeof navigator === 'undefined') return false;
  try {
    const total = Math.max(0, Number(quantidade) || 0);
    if (total > 0 && 'setAppBadge' in navigator) {
      await navigator.setAppBadge(total);
      return true;
    }
    if (total === 0 && 'clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
      return true;
    }
  } catch {
    // Alguns sistemas permitem notificações, mas deixam o selo desativado nas preferências do aplicativo.
  }
  return false;
}

export async function notificarPwa({ titulo, corpo, tag = 'pcm', url = '/dashboard', forcar = false }) {
  if (!notificacoesDisponiveis() || Notification.permission !== 'granted') return false;
  if (!forcar && document.visibilityState === 'visible') return false;

  const registro = await navigator.serviceWorker.ready;
  await registro.showNotification(titulo, {
    body: corpo,
    tag,
    renotify: true,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url },
  });
  return true;
}
