/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '../lib/api';
import { toast, toastError, toastSuccess } from '../lib/toast';
import { notificacoesDisponiveis } from '../lib/pwa';

const NotificacoesContext = createContext(null);
const chaveAplicacao = (valor) => {
  const base64 = (valor + '='.repeat((4 - valor.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(base64);
  return Uint8Array.from(binario, (caractere) => caractere.charCodeAt(0));
};

async function registrarDispositivo(chavePublica) {
  const registro = await navigator.serviceWorker.ready;
  const chave = chaveAplicacao(chavePublica);
  let atual = await registro.pushManager.getSubscription();
  const anterior = atual?.options?.applicationServerKey;
  if (anterior && (new Uint8Array(anterior).length !== chave.length ||
    new Uint8Array(anterior).some((byte, indice) => byte !== chave[indice]))) {
    await atual.unsubscribe();
    atual = null;
  }
  const inscricao = atual || await registro.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: chave,
  });
  await api.post('/notificacoes/push/inscricoes', inscricao.toJSON());
}

export function NotificacoesProvider({ children }) {
  const { usuario } = useAuth();
  const [itens, setItens] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(0);
  const [permissao, setPermissao] = useState(() => notificacoesDisponiveis() ? Notification.permission : 'indisponivel');
  const [pushDisponivel, setPushDisponivel] = useState(false);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async (numero = 1) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const { data } = await api.get('/notificacoes', { params: { pagina: numero } });
    if (token !== localStorage.getItem('token')) return;
    setItens(data.itens);
    setNaoLidas(data.naoLidas);
    setPagina(data.pagina);
    setPaginas(data.paginas);
  }, []);

  const ativar = async () => {
    if (!notificacoesDisponiveis() || !('PushManager' in window)) {
      toastError('Este dispositivo não oferece Web Push ou o servidor ainda não foi configurado.');
      return false;
    }
    setProcessando(true);
    try {
      const resultado = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      setPermissao(resultado);
      if (resultado !== 'granted') {
        toast.dismiss('pcm-ativar-push');
        toastError(resultado === 'denied' ? 'O navegador bloqueou as notificações. Libere a permissão nas configurações do site.' : 'Você pode ativar as notificações quando quiser.');
        return false;
      }
      const { data } = await api.get('/notificacoes/push/config');
      if (!data.disponivel) throw new Error('Web Push ainda não foi configurado no servidor.');
      await registrarDispositivo(data.chavePublica);
      toast.dismiss('pcm-ativar-push');
      toastSuccess('Notificações ativadas neste dispositivo.');
      return true;
    } catch (erro) {
      toastError(erro.response?.data?.erro || erro.message || 'Não foi possível ativar as notificações neste dispositivo.');
      return false;
    } finally { setProcessando(false); }
  };

  useEffect(() => {
    if (!usuario?.id) {
      setItens([]); setNaoLidas(0); setPushDisponivel(false);
      toast.dismiss('pcm-ativar-push');
      return undefined;
    }
    let ativo = true;
    let socket;
    setItens([]); setNaoLidas(0);
    carregar().catch(() => {});
    api.get('/notificacoes/push/config').then(async ({ data }) => {
      if (!ativo) return;
      const disponivel = Boolean(data.disponivel && notificacoesDisponiveis() && 'PushManager' in window);
      setPushDisponivel(disponivel);
      if (!disponivel) return;
      const estado = Notification.permission;
      setPermissao(estado);
      if (estado === 'granted') {
        await registrarDispositivo(data.chavePublica).catch(() => {});
      } else {
        toast.custom(() => <div className="w-[min(92vw,390px)] rounded-2xl border border-[#C9963A]/30 bg-white p-4 shadow-2xl sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A3A6B] text-white">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">PCM • Avisos</p>
              <p className="mt-1 text-base font-bold text-[#1A3A6B]">Fique por dentro das novidades</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{estado === 'denied'
                ? 'As notificações foram bloqueadas. Você pode liberar o PCM nas configurações deste site no navegador.'
                : 'Receba avisos no celular ou navegador mesmo quando o aplicativo estiver fechado. Você pode decidir agora ou depois.'}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => toast.dismiss('pcm-ativar-push')} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Agora não</button>
            {estado === 'default' && <button type="button" onClick={() => { window.dispatchEvent(new Event('pcm:ativar-push')); }} className="rounded-lg bg-[#1A3A6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f2347]">Ativar notificações</button>}
          </div>
        </div>, {
          id: 'pcm-ativar-push',
          duration: Infinity,
        });
      }
    }).catch(() => {});
    const apiBase = new URL(api.defaults.baseURL || '/api', window.location.origin);
    socket = io(apiBase.origin, { path: '/socket.io', auth: { token: localStorage.getItem('token') }, autoConnect: true });
    socket.on('notificacao:nova', (notificacao) => {
      if (!ativo) return;
      setItens((anteriores) => [notificacao, ...anteriores].slice(0, 20));
      setNaoLidas((numero) => numero + 1);
      toast.info(notificacao.titulo, { description: notificacao.mensagem, duration: 6000 });
    });
    socket.on('connect', () => carregar(1).catch(() => {}));
    const ativarPeloToast = () => { void ativar(); };
    window.addEventListener('pcm:ativar-push', ativarPeloToast);
    const atualizarPermissao = () => setPermissao(notificacoesDisponiveis() ? Notification.permission : 'indisponivel');
    window.addEventListener('focus', atualizarPermissao);
    return () => {
      ativo = false;
      socket.disconnect();
      window.removeEventListener('pcm:ativar-push', ativarPeloToast);
      window.removeEventListener('focus', atualizarPermissao);
      toast.dismiss('pcm-ativar-push');
    };
    // A conexão acompanha a sessão, sem recriar o socket ao mudar a página.
  }, [usuario?.id, carregar]);

  const marcarLida = async (id) => {
    await api.patch(`/notificacoes/${id}/lida`);
    setItens((anteriores) => anteriores.map((item) => item.id === id ? { ...item, lidaEm: item.lidaEm || new Date().toISOString() } : item));
    setNaoLidas((numero) => Math.max(0, numero - 1));
  };
  const marcarTodas = async () => {
    await api.patch('/notificacoes/lidas');
    setItens((anteriores) => anteriores.map((item) => ({ ...item, lidaEm: item.lidaEm || new Date().toISOString() })));
    setNaoLidas(0);
  };

  return <NotificacoesContext.Provider value={{ itens, naoLidas, pagina, paginas, permissao, pushDisponivel, processando, carregar, ativar, marcarLida, marcarTodas }}>
    {children}
  </NotificacoesContext.Provider>;
}

export const useNotificacoes = () => useContext(NotificacoesContext);
