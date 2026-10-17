import api from './api';
import { notificacoesDisponiveis } from './pwa';

export async function removerInscricaoDoDispositivo() {
  if (!notificacoesDisponiveis() || !('PushManager' in window)) return;
  const registro = await navigator.serviceWorker.getRegistration();
  const inscricao = await registro?.pushManager.getSubscription();
  if (!inscricao) return;
  try { await api.delete('/notificacoes/push/inscricoes', { data: { endpoint: inscricao.endpoint } }); }
  finally { await inscricao.unsubscribe(); }
}
