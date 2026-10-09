import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { toastError } from '../lib/toast';

const PERFIS = {
  SUPER_ADMIN: 'Super Administrador',
  ADMINISTRADOR: 'Administrador',
  PASTOR_REGIONAL: 'Pastor Regional',
  PASTOR_DISTRITAL: 'Pastor Distrital',
  COORDENADOR_REGIONAL: 'Coordenador Regional',
  DIRETOR_MISSIONARIO_IGREJA: 'Diretor Missionário',
  DUPLA_MISSIONARIA: 'Dupla Missionária',
};

const CATEGORIAS = {
  AUTENTICACAO: { label: 'Acesso', cor: 'bg-blue-50 text-blue-700 border-blue-200' },
  CONSULTA: { label: 'Consulta', cor: 'bg-slate-50 text-slate-700 border-slate-200' },
  ALTERACAO: { label: 'Alteração', cor: 'bg-amber-50 text-amber-700 border-amber-200' },
  NEGADA: { label: 'Não concluída', cor: 'bg-orange-50 text-orange-700 border-orange-200' },
  ERRO: { label: 'Erro', cor: 'bg-red-50 text-red-700 border-red-200' },
  DESEMPENHO: { label: 'Desempenho', cor: 'bg-purple-50 text-purple-700 border-purple-200' },
  NAVEGACAO: { label: 'Navegação', cor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
};

const formatarData = (valor) => valor
  ? new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Fortaleza',
  }).format(new Date(valor))
  : '—';

const formatarDuracao = (segundos = 0) => {
  const total = Math.max(0, Number(segundos) || 0);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segs = total % 60;
  if (horas) return `${horas}h ${minutos}min`;
  if (minutos) return `${minutos}min ${segs}s`;
  return `${segs}s`;
};

function CardResumo({ titulo, valor, descricao, destaque = 'azul' }) {
  const cores = {
    azul: 'border-[#1A3A6B] text-[#1A3A6B]',
    verde: 'border-emerald-500 text-emerald-700',
    vermelho: 'border-red-500 text-red-700',
    amarelo: 'border-[#C9963A] text-[#9a6c17]',
    roxo: 'border-purple-500 text-purple-700',
  };
  return (
    <div className={`rounded-2xl border border-slate-200 border-t-4 bg-white p-5 shadow-sm ${cores[destaque]}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
      <p className="mt-1 text-3xl font-black">{valor}</p>
      <p className="mt-1 text-xs text-slate-500">{descricao}</p>
    </div>
  );
}

function CategoriaBadge({ categoria }) {
  const config = CATEGORIAS[categoria] || { label: categoria || 'Sistema', cor: 'bg-slate-50 text-slate-700 border-slate-200' };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${config.cor}`}>{config.label}</span>;
}

export default function AuditoriaLogs() {
  const [aba, setAba] = useState('sessoes');
  const [resumo, setResumo] = useState(null);
  const [dados, setDados] = useState({ itens: [], total: 0, pagina: 1, paginas: 1 });
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [status, setStatus] = useState('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [pagina, setPagina] = useState(1);
  const [detalheAberto, setDetalheAberto] = useState(null);
  const [sessaoSelecionada, setSessaoSelecionada] = useState('');

  const carregarResumo = useCallback(async () => {
    try {
      const { data } = await api.get('/auditoria/resumo');
      setResumo(data);
    } catch (erro) {
      toastError(erro.response?.data?.erro || 'Não foi possível carregar o resumo da auditoria.');
    }
  }, []);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ pagina: String(pagina), limite: aba === 'sessoes' ? '30' : '50' });
      if (busca.trim()) params.set('busca', busca.trim());
      if (de) params.set('de', de);
      if (ate) params.set('ate', ate);
      if (sessaoSelecionada && aba !== 'sessoes') params.set('sessaoId', sessaoSelecionada);
      if (aba === 'sessoes') {
        if (status) params.set('status', status);
      } else if (aba === 'erros') {
        params.set('categoria', 'ERRO');
      } else if (categoria) {
        params.set('categoria', categoria);
      }
      const rota = aba === 'sessoes' ? '/auditoria/sessoes' : '/auditoria/logs';
      const { data } = await api.get(`${rota}?${params.toString()}`);
      setDados(data);
    } catch (erro) {
      toastError(erro.response?.data?.erro || 'Não foi possível carregar os registros de auditoria.');
    } finally {
      setCarregando(false);
    }
  }, [aba, busca, categoria, status, de, ate, pagina, sessaoSelecionada]);

  useEffect(() => { void carregarResumo(); }, [carregarResumo]);
  useEffect(() => { void carregarDados(); }, [carregarDados]);

  const trocarAba = (novaAba) => {
    setAba(novaAba);
    setPagina(1);
    setDetalheAberto(null);
    if (novaAba === 'sessoes') setSessaoSelecionada('');
  };

  const verAtividades = (sessaoId) => {
    setSessaoSelecionada(sessaoId);
    setAba('atividades');
    setPagina(1);
  };

  const limparFiltros = () => {
    setBusca('');
    setCategoria('');
    setStatus('');
    setDe('');
    setAte('');
    setSessaoSelecionada('');
    setPagina(1);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C9963A]">Controle exclusivo do Super Administrador</p>
            <h1 className="mt-2 text-3xl font-black text-[#1A3A6B] sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
              Auditoria e Logs
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Acompanhe acessos, tempo de utilização, atividades, respostas, falhas e lentidão do sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { void carregarResumo(); void carregarDados(); }}
            className="rounded-xl bg-[#1A3A6B] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#142f59]"
          >
            Atualizar informações
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
        <CardResumo titulo="Online agora" valor={resumo?.onlineAgora ?? '—'} descricao="Ativos nos últimos 2 minutos" destaque="verde" />
        <CardResumo titulo="Acessos hoje" valor={resumo?.acessosHoje ?? '—'} descricao="Sessões iniciadas" />
        <CardResumo titulo="Usuários hoje" valor={resumo?.usuariosAtivosHoje ?? '—'} descricao="Pessoas diferentes" />
        <CardResumo titulo="Tempo médio" valor={resumo ? formatarDuracao(resumo.duracaoMediaSegundos) : '—'} descricao="Por sessão hoje" destaque="amarelo" />
        <CardResumo titulo="Falhas de login" valor={resumo?.falhasLoginHoje ?? '—'} descricao="Tentativas não concluídas" destaque="vermelho" />
        <CardResumo titulo="Erros hoje" valor={resumo?.errosHoje ?? '—'} descricao="Interface ou servidor" destaque="vermelho" />
        <CardResumo titulo="Operações lentas" valor={resumo?.operacoesLentasHoje ?? '—'} descricao="Mais de 3 segundos" destaque="roxo" />
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4 sm:p-6">
          <div className="flex flex-wrap gap-2">
            {[
              ['sessoes', 'Sessões de acesso'],
              ['atividades', 'Atividades'],
              ['erros', 'Erros e falhas'],
            ].map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                onClick={() => trocarAba(chave)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${aba === chave ? 'bg-[#1A3A6B] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <input
              value={busca}
              onChange={(event) => { setBusca(event.target.value); setPagina(1); }}
              placeholder="Usuário, e-mail, ação ou rota..."
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#1A3A6B] xl:col-span-2"
            />
            {aba === 'sessoes' ? (
              <select value={status} onChange={(event) => { setStatus(event.target.value); setPagina(1); }} className="rounded-xl border border-slate-300 px-3 py-3 text-sm">
                <option value="">Todos os estados</option>
                <option value="ATIVA">Sessão ativa</option>
                <option value="ENCERRADA">Logout realizado</option>
                <option value="SUBSTITUIDA">Sessão substituída</option>
              </select>
            ) : aba === 'atividades' ? (
              <select value={categoria} onChange={(event) => { setCategoria(event.target.value); setPagina(1); }} className="rounded-xl border border-slate-300 px-3 py-3 text-sm">
                <option value="">Todas as categorias</option>
                {Object.entries(CATEGORIAS).map(([chave, item]) => <option key={chave} value={chave}>{item.label}</option>)}
              </select>
            ) : <div className="hidden xl:block" />}
            <input type="date" value={de} onChange={(event) => { setDe(event.target.value); setPagina(1); }} className="rounded-xl border border-slate-300 px-3 py-3 text-sm" title="Data inicial" />
            <input type="date" value={ate} onChange={(event) => { setAte(event.target.value); setPagina(1); }} className="rounded-xl border border-slate-300 px-3 py-3 text-sm" title="Data final" />
            <button type="button" onClick={limparFiltros} className="rounded-xl border border-[#1A3A6B] px-4 py-3 text-sm font-bold text-[#1A3A6B] hover:bg-blue-50">Limpar filtros</button>
          </div>
          {sessaoSelecionada && aba !== 'sessoes' && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-800">
              Exibindo somente a linha do tempo da sessão selecionada.
              <button type="button" onClick={() => setSessaoSelecionada('')} className="font-black underline">Ver todas</button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          {carregando ? (
            <div className="flex min-h-72 items-center justify-center text-sm font-semibold text-slate-500">Carregando registros...</div>
          ) : dados.itens.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <p className="text-lg font-bold text-[#1A3A6B]">Nenhum registro encontrado</p>
              <p className="mt-1 text-sm text-slate-500">Ajuste os filtros ou aguarde novas atividades.</p>
            </div>
          ) : aba === 'sessoes' ? (
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-4">Usuário</th><th className="px-5 py-4">Entrada</th><th className="px-5 py-4">Última atividade</th><th className="px-5 py-4">Tempo</th><th className="px-5 py-4">Dispositivo</th><th className="px-5 py-4">Estado</th><th className="px-5 py-4">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dados.itens.map((sessao) => (
                  <tr key={sessao.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><p className="font-bold text-[#1A3A6B]">{sessao.usuarioNome}</p><p className="text-xs text-slate-500">{sessao.usuarioEmail}</p><p className="mt-1 text-[11px] font-semibold text-[#C9963A]">{PERFIS[sessao.perfil] || sessao.perfil}</p></td>
                    <td className="px-5 py-4 text-slate-600">{formatarData(sessao.inicioEm)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatarData(sessao.ultimaAtividadeEm)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{formatarDuracao(sessao.duracaoSegundos)}</td>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-700">{sessao.navegador}</p><p className="text-xs text-slate-500">{sessao.sistemaOperacional} · {sessao.dispositivo}</p><p className="text-[11px] text-slate-400">IP {sessao.ip || 'não informado'}</p></td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${sessao.online ? 'bg-emerald-100 text-emerald-700' : sessao.status === 'ENCERRADA' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>{sessao.online ? 'Online agora' : sessao.status === 'ENCERRADA' ? 'Saiu do sistema' : 'Inativa'}</span></td>
                    <td className="px-5 py-4"><button type="button" onClick={() => verAtividades(sessao.id)} className="rounded-lg border border-[#1A3A6B] px-3 py-2 text-xs font-bold text-[#1A3A6B] hover:bg-blue-50">Ver atividades ({sessao._count?.logs || 0})</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="divide-y divide-slate-100">
              {dados.itens.map((log) => (
                <article key={log.id} className="p-5 hover:bg-slate-50/60">
                  <button type="button" onClick={() => setDetalheAberto(detalheAberto === log.id ? null : log.id)} className="w-full text-left">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className={`mt-1 h-2.5 w-2.5 flex-none rounded-full ${log.sucesso ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><CategoriaBadge categoria={log.categoria} /><span className="text-xs font-semibold text-slate-400">{log.origem}</span>{log.duracaoMs >= 3000 && <span className="rounded-full bg-purple-50 px-2 py-1 text-[11px] font-bold text-purple-700">Lenta: {(log.duracaoMs / 1000).toFixed(1)}s</span>}</div>
                          <p className="mt-2 font-bold text-[#1A3A6B]">{log.descricao}</p>
                          <p className="mt-1 text-xs text-slate-500">{log.usuarioNome || log.usuarioEmail || 'Acesso não identificado'}{log.perfil ? ` · ${PERFIS[log.perfil] || log.perfil}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex-none text-xs text-slate-500 lg:text-right"><p>{formatarData(log.criadoEm)}</p><p className="mt-1 font-mono">{log.metodo || ''} {log.rota || ''} {log.statusHttp || ''}</p></div>
                    </div>
                  </button>
                  {detalheAberto === log.id && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                      <div className="grid gap-2 sm:grid-cols-3"><p><strong>Ação:</strong> {log.acao}</p><p><strong>Recurso:</strong> {log.recurso || '—'}</p><p><strong>IP:</strong> {log.ip || '—'}</p></div>
                      {log.detalhes && <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-mono text-[11px]">{JSON.stringify(log.detalhes, null, 2)}</pre>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-xs text-slate-500">{dados.total} registro(s) encontrado(s) · página {dados.pagina} de {dados.paginas}</p>
          <div className="flex gap-2">
            <button type="button" disabled={pagina <= 1} onClick={() => setPagina((valor) => Math.max(1, valor - 1))} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40">Anterior</button>
            <button type="button" disabled={pagina >= dados.paginas} onClick={() => setPagina((valor) => valor + 1)} className="rounded-lg bg-[#1A3A6B] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Próxima</button>
          </div>
        </div>
      </section>

      {resumo?.errosRecentes?.length > 0 && (
        <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Erros mais recentes</h2>
          <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {resumo.errosRecentes.map((erro) => (
              <div key={erro.id} className="rounded-xl border border-red-100 bg-red-50/40 p-4">
                <p className="text-xs font-bold text-red-700">{erro.origem} · {formatarData(erro.criadoEm)}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{erro.descricao}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{erro.usuarioNome || 'Não identificado'} · {erro.rota || 'Sem rota'}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
