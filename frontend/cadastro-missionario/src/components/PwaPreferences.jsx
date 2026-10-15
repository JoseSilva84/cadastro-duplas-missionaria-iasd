import { useEffect, useState } from 'react';
import { limparCacheDoUsuario, resumoCacheLocal } from '../lib/cacheLocal';
import { notificarPwa, notificacoesDisponiveis, pedirPermissaoNotificacoes } from '../lib/pwa';
import { toastError, toastSuccess } from '../lib/toast';

const formatarData = (valor) => valor ? new Date(valor).toLocaleString('pt-BR') : 'Nenhum dado salvo ainda';

export default function PwaPreferences({ usuario }) {
  const [permissao, setPermissao] = useState(() => {
    if (!notificacoesDisponiveis()) return 'indisponivel';
    return Notification.permission;
  });
  const [cache, setCache] = useState({ itens: 0, salvoEm: null });
  const [processando, setProcessando] = useState(false);

  const atualizarResumo = async () => setCache(await resumoCacheLocal(usuario));

  useEffect(() => {
    atualizarResumo();
    // O identificador da conta separa os dados offline de cada usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, usuario?.email]);

  const ativarNotificacoes = async () => {
    setProcessando(true);
    try {
      const resultado = await pedirPermissaoNotificacoes();
      setPermissao(resultado);
      if (resultado === 'granted') {
        await notificarPwa({
          titulo: 'Notificações ativadas',
          corpo: 'O aplicativo poderá avisar quando uma atualização importante for concluída.',
          tag: 'pcm-notificacoes-ativas',
          url: '/configuracoes',
          forcar: true,
        });
        toastSuccess('Notificações ativadas neste dispositivo.');
      } else if (resultado === 'denied') {
        toastError('A permissão foi bloqueada pelo navegador. Ela pode ser liberada nas configurações do site.');
      }
    } finally {
      setProcessando(false);
    }
  };

  const limparDados = async () => {
    setProcessando(true);
    try {
      await limparCacheDoUsuario(usuario);
      await atualizarResumo();
      toastSuccess('Dados offline deste usuário removidos do dispositivo.');
    } finally {
      setProcessando(false);
    }
  };

  const testarNotificacao = async () => {
    await notificarPwa({
      titulo: 'Capacitação Missionária',
      corpo: 'As notificações deste dispositivo estão funcionando corretamente.',
      tag: 'pcm-notificacao-teste',
      url: '/configuracoes',
      forcar: true,
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#C9963A]">Notificações do aplicativo</p>
            <h2 className="mt-1 text-lg font-bold text-[#1A3A6B]">Avisos no computador ou celular</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">
              Receba avisos quando uma sincronização terminar ou quando houver uma atualização importante do aplicativo.
            </p>
            <p className="mt-3 text-xs font-semibold text-gray-500">
              Situação: {permissao === 'granted' ? 'ativadas' : permissao === 'denied' ? 'bloqueadas pelo navegador' : permissao === 'indisponivel' ? 'não disponíveis neste navegador' : 'aguardando autorização'}
            </p>
          </div>
          {permissao === 'granted' ? (
            <button type="button" onClick={testarNotificacao} className="btn-outline shrink-0">Testar notificação</button>
          ) : (
            <button type="button" disabled={processando || permissao === 'indisponivel'} onClick={ativarNotificacoes} className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
              Ativar notificações
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#C9963A]">Dados offline</p>
            <h2 className="mt-1 text-lg font-bold text-[#1A3A6B]">Cópia local neste dispositivo</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">
              O sistema guarda as páginas consultadas para apresentá-las rapidamente e permitir a leitura quando a conexão estiver indisponível. Os dados são separados por usuário e removidos ao sair da conta.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{cache.itens} conjunto(s) salvo(s)</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">Última cópia: {formatarData(cache.salvoEm)}</span>
            </div>
          </div>
          <button type="button" disabled={processando || cache.itens === 0} onClick={limparDados} className="btn-outline shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
            Limpar dados offline
          </button>
        </div>
      </section>
    </div>
  );
}
