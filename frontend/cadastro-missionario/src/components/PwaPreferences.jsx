import { useCallback, useEffect, useState } from 'react';
import { limparCacheDoUsuario, resumoCacheLocal } from '../lib/cacheLocal';
import { notificarPwa } from '../lib/pwa';
import { removerInscricaoDoDispositivo } from '../lib/push';
import api from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import { useNotificacoes } from '../contexts/NotificacoesContext';

const formatarData = (valor) => valor ? new Date(valor).toLocaleString('pt-BR') : 'Nenhum dado salvo ainda';

export default function PwaPreferences({ usuario }) {
  const { permissao, pushDisponivel, ativar, processando: ativando } = useNotificacoes();
  const [cache, setCache] = useState({ itens: 0, salvoEm: null });
  const [processando, setProcessando] = useState(false);
  const [dispositivos, setDispositivos] = useState([]);
  const [carregandoDispositivos, setCarregandoDispositivos] = useState(false);
  const [testando, setTestando] = useState(null);
  const [removendo, setRemovendo] = useState(null);

  const atualizarResumo = async () => setCache(await resumoCacheLocal(usuario));

  useEffect(() => {
    atualizarResumo();
    // O identificador da conta separa os dados offline de cada usuário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.id, usuario?.email]);

  const carregarDispositivos = useCallback(async () => {
    if (!usuario?.id) return;
    setCarregandoDispositivos(true);
    try {
      const { data } = await api.get('/notificacoes/push/dispositivos');
      setDispositivos(data.itens || []);
    } catch {
      setDispositivos([]);
    } finally {
      setCarregandoDispositivos(false);
    }
  }, [usuario?.id]);

  useEffect(() => {
    carregarDispositivos();
  }, [carregarDispositivos]);

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

  const testarRemoto = async (id) => {
    setTestando(id);
    try {
      const { data } = await api.post(`/notificacoes/push/dispositivos/${id}/teste`);
      toastSuccess(`Teste remoto aceito pelo serviço de Push (status ${data.status}).`);
      await carregarDispositivos();
    } catch (erro) {
      toastError(erro.response?.data?.erro || 'Não foi possível entregar o teste remoto neste dispositivo.');
      await carregarDispositivos();
    } finally {
      setTestando(null);
    }
  };

  const removerDispositivo = async (id) => {
    setRemovendo(id);
    try {
      const atual = String(id) === localStorage.getItem('pcmPushInscricaoId');
      if (atual) await removerInscricaoDoDispositivo();
      else await api.delete(`/notificacoes/push/dispositivos/${id}`);
      toastSuccess('Dispositivo removido das notificações.');
      await carregarDispositivos();
    } catch (erro) {
      toastError(erro.response?.data?.erro || 'Não foi possível remover este dispositivo.');
    } finally {
      setRemovendo(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#C9963A]">Notificações do aplicativo</p>
            <h2 className="mt-1 text-lg font-bold text-[#1A3A6B]">Avisos no computador ou celular</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">
              Receba avisos sobre novidades do sistema mesmo com o aplicativo fechado. As notificações também ficam guardadas no sino quando você abre o PCM.
            </p>
            {permissao === 'default' && (
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
                Por segurança, o navegador exige sua autorização uma única vez. Depois disso, o aplicativo mantém as notificações ativas neste dispositivo.
              </p>
            )}
            <p className="mt-3 text-xs font-semibold text-gray-500">
              Situação: {!pushDisponivel ? 'Web Push indisponível neste dispositivo ou aguardando configuração do servidor' : permissao === 'granted' ? 'ativadas' : permissao === 'denied' ? 'bloqueadas pelo navegador' : 'aguardando autorização'}
            </p>
          </div>
          {permissao === 'granted' ? (
            <button type="button" onClick={testarNotificacao} className="btn-outline shrink-0">Testar aviso local</button>
          ) : (
            <button type="button" disabled={ativando || !pushDisponivel} onClick={ativar} className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
              {ativando ? 'Ativando...' : 'Ativar notificações'}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#C9963A]">Diagnóstico de entrega</p>
            <h2 className="mt-1 text-lg font-bold text-[#1A3A6B]">Meus dispositivos</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">Cada computador, celular ou tablet precisa de uma inscrição própria. O teste remoto percorre servidor, serviço de Push e aparelho.</p>
          </div>
          <button type="button" onClick={carregarDispositivos} disabled={carregandoDispositivos} className="btn-outline shrink-0 disabled:opacity-50">{carregandoDispositivos ? 'Atualizando...' : 'Atualizar'}</button>
        </div>
        {!pushDisponivel && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">O Web Push não está disponível neste navegador ou ainda não foi configurado.</p>}
        {!carregandoDispositivos && dispositivos.length === 0 && <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nenhum dispositivo inscrito nesta conta.</p>}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {dispositivos.map((dispositivo) => {
            const atual = String(dispositivo.id) === localStorage.getItem('pcmPushInscricaoId');
            const sucesso = dispositivo.ultimoSucessoEm && (!dispositivo.ultimaFalhaEm || new Date(dispositivo.ultimoSucessoEm) >= new Date(dispositivo.ultimaFalhaEm));
            return <article key={dispositivo.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#1A3A6B]">{dispositivo.nomeDispositivo || [dispositivo.plataforma, dispositivo.navegador].filter(Boolean).join(' · ') || 'Dispositivo sem identificação'}{atual ? ' · Este aparelho' : ''}</p>
                  <p className="mt-1 text-xs text-slate-500">{dispositivo.servico} · inscrito em {formatarData(dispositivo.criadaEm)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${dispositivo.ativa ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{dispositivo.ativa ? 'Ativo' : 'Expirado'}</span>
              </div>
              <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600">
                {sucesso ? <p><strong className="text-emerald-700">Último envio aceito:</strong> {formatarData(dispositivo.ultimoSucessoEm)} · status {dispositivo.ultimoStatus || 201}</p> : dispositivo.ultimaFalhaEm ? <p><strong className="text-red-700">Última falha:</strong> {formatarData(dispositivo.ultimaFalhaEm)} · {dispositivo.ultimoErro || `status ${dispositivo.ultimoStatus || 'desconhecido'}`}</p> : <p>Nenhum teste remoto registrado ainda.</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => testarRemoto(dispositivo.id)} disabled={!dispositivo.ativa || testando === dispositivo.id} className="rounded-lg bg-[#1A3A6B] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{testando === dispositivo.id ? 'Testando...' : 'Testar envio remoto'}</button>
                <button type="button" onClick={() => removerDispositivo(dispositivo.id)} disabled={removendo === dispositivo.id} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">{removendo === dispositivo.id ? 'Removendo...' : 'Remover'}</button>
              </div>
            </article>;
          })}
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
