import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import BackButton from '../components/BackButton';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const hojeISO = () => new Date().toISOString().split('T')[0];

const primeiroDiaDoMes = () => {
  const data = new Date();
  data.setDate(1);
  return data.toISOString().split('T')[0];
};

const formatarData = (valor) => {
  if (!valor) return 'Sem data';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Sem data';
  return data.toLocaleDateString('pt-BR');
};

const nomeDupla = (dupla) => {
  if (!dupla) return 'Dupla nao encontrada';
  return `${dupla.liderNome || 'Lider'} + ${dupla.membro2Nome || 'Membro'}`;
};

const MetricCard = ({ label, valor, detalhe, cor }) => (
  <div className="card">
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-2 text-3xl font-bold leading-none" style={{ color: cor }}>{numero(valor)}</p>
    {detalhe && <p className="mt-3 text-sm font-medium text-gray-500">{detalhe}</p>}
  </div>
);

const Info = ({ label, valor }) => (
  <div className="rounded-lg bg-[#F4F5F7] px-4 py-3">
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-[#1A3A6B]">{valor || 'Nao informado'}</p>
  </div>
);

export default function RelatorioAssistencia() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';
  const [dados, setDados] = useState(null);
  const [coordenadores, setCoordenadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState({
    de: '',
    ate: '',
    coordenadorId: '',
  });
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [modalRegistrosAberto, setModalRegistrosAberto] = useState(false);

  useEffect(() => {
    api.get('/acompanhamentos/coordenadores')
      .then((res) => setCoordenadores(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCoordenadores([]));
  }, []);

  useEffect(() => {
    const params = {};
    if (filtros.de) params.de = filtros.de;
    if (filtros.ate) params.ate = filtros.ate;
    if (filtros.coordenadorId) params.coordenadorId = filtros.coordenadorId;

    setCarregando(true);
    setErro('');
    api.get('/relatorios/acompanhamento', { params })
      .then((res) => setDados(res.data || null))
      .catch((err) => setErro(err.response?.data?.erro || 'Erro ao carregar resumo de assistencia.'))
      .finally(() => setCarregando(false));
  }, [filtros]);

  const saidas = useMemo(() => (
    (dados?.porSemana || []).flatMap((semana) => (
      (semana.saidas || []).map((saida) => ({ ...saida, semanaInicio: semana.semanaInicio }))
    )).sort((a, b) => new Date(b.dataSaida) - new Date(a.dataSaida))
  ), [dados]);

  const resumo = useMemo(() => {
    const duplaIds = new Set();
    const porCoordenador = {};
    const porDupla = {};
    let relatoriosPreenchidos = 0;

    saidas.forEach((saida) => {
      if (String(saida.observacoes || '').trim()) relatoriosPreenchidos += 1;
      const coordenadorNome = saida.coordenador?.nome || 'Sem coordenador';
      porCoordenador[coordenadorNome] = (porCoordenador[coordenadorNome] || 0) + 1;

      (saida.duplas || []).forEach((item) => {
        const dupla = item.dupla;
        if (!dupla?.id) return;
        duplaIds.add(dupla.id);
        const chave = String(dupla.id);
        if (!porDupla[chave]) {
          porDupla[chave] = {
            id: dupla.id,
            nome: nomeDupla(dupla),
            bairro: dupla.bairro || 'Sem bairro',
            total: 0,
          };
        }
        porDupla[chave].total += 1;
      });
    });

    const coordenadorMaisAtivo = Object.entries(porCoordenador)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

    return {
      totalSaidas: dados?.totalSaidas || 0,
      totalDuplasVisitadas: dados?.totalDuplasVisitadas || 0,
      duplasUnicas: duplaIds.size,
      relatoriosPreenchidos,
      coordenadorMaisAtivo: coordenadorMaisAtivo ? { nome: coordenadorMaisAtivo[0], total: coordenadorMaisAtivo[1] } : null,
      duplasMaisVisitadas: Object.values(porDupla).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome)).slice(0, 8),
    };
  }, [dados, saidas]);

  const limparFiltros = () => setFiltros({ de: '', ate: '', coordenadorId: '' });
  const filtrarMesAtual = () => setFiltros({ de: primeiroDiaDoMes(), ate: hojeISO(), coordenadorId: filtros.coordenadorId });

  if (carregando && !dados) return <LoadingState mensagem="Carregando resumo de assistencia..." />;

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <BackButton fallbackTo={isDireto ? '/direto/dashboard' : '/dashboard'} className="mb-3" />
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
              <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Assistencia</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Resumo de Visitas de Assistencia
            </h1>
            <p className="text-gray-400 text-sm mt-1">Indicadores, historico e detalhes dos acompanhamentos realizados pelos coordenadores regionais.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/relatorios/coordenador-regional`)}>
              Relatorio regional
            </button>
            <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/registro-saida`)}>
              Registrar nova assistencia
            </button>
          </div>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        {erro && <div className="card border border-red-100 text-sm text-red-600">{erro}</div>}

        <section className="card">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1fr_1.2fr_auto_auto_auto] xl:items-end">
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">De</span>
              <input type="date" className="input-field" value={filtros.de} onChange={(event) => setFiltros((atual) => ({ ...atual, de: event.target.value }))} />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Ate</span>
              <input type="date" className="input-field" value={filtros.ate} onChange={(event) => setFiltros((atual) => ({ ...atual, ate: event.target.value }))} />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Coordenador</span>
              <select className="input-field" value={filtros.coordenadorId} onChange={(event) => setFiltros((atual) => ({ ...atual, coordenadorId: event.target.value }))}>
                <option value="">Todos os coordenadores</option>
                {coordenadores.map((coordenador) => (
                  <option key={coordenador.id} value={coordenador.id}>
                    {coordenador.nome}{coordenador.regiao?.nome ? ` - ${coordenador.regiao.nome}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={limparFiltros}>Limpar</button>
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={filtrarMesAtual}>Mes atual</button>
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setFiltros((atual) => ({ ...atual }))}>Atualizar</button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Assistencias" valor={resumo.totalSaidas} detalhe="Saidas registradas no periodo" cor="#7c3aed" />
          <MetricCard label="Duplas acompanhadas" valor={resumo.totalDuplasVisitadas} detalhe="Contagem total, incluindo repeticoes" cor="#0d9488" />
          <MetricCard label="Duplas unicas" valor={resumo.duplasUnicas} detalhe="Duplas distintas acompanhadas" cor="#1A3A6B" />
          <MetricCard label="Relatorios preenchidos" valor={resumo.relatoriosPreenchidos} detalhe={resumo.coordenadorMaisAtivo ? `Mais ativo: ${resumo.coordenadorMaisAtivo.nome}` : 'Com observacoes registradas'} cor="#C9963A" />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="card xl:col-span-2">
            <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[#1A3A6B]">Historico de assistencias</h2>
                <p className="max-w-xl text-sm text-gray-400">Clique em uma saida para ver as duplas acompanhadas e o relato.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="rounded-lg bg-[#1A3A6B]/10 px-3 py-2 text-sm font-bold text-[#1A3A6B]">{numero(saidas.length)} registros</span>
                <button type="button" className="btn-outline whitespace-nowrap px-3 py-2 text-sm" onClick={() => setModalRegistrosAberto(true)}>
                  Ver todos os registros
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {saidas.slice(0, 6).map((saida) => (
                <button
                  key={saida.id}
                  type="button"
                  onClick={() => setRegistroSelecionado(saida)}
                  className="w-full overflow-hidden rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[#C9963A]/40 hover:shadow-sm"
                >
                  <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[8.5rem_minmax(12rem,1.15fr)_6.5rem_minmax(0,1.45fr)] lg:items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Data</p>
                      <p className="font-bold text-[#1A3A6B]">{formatarData(saida.dataSaida)}</p>
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Coordenador</p>
                      <p className="break-words font-semibold leading-snug text-gray-700">{saida.coordenador?.nome || 'Sem coordenador'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Duplas</p>
                      <p className="text-2xl font-bold text-[#0d9488]">{numero(saida.duplas?.length || 0)}</p>
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Relato</p>
                      <p className="line-clamp-2 max-w-full break-words text-sm leading-snug text-gray-500 [overflow-wrap:anywhere]">{saida.observacoes || 'Sem relato informado.'}</p>
                    </div>
                  </div>
                </button>
              ))}

              {saidas.length > 6 && (
                <button type="button" onClick={() => setModalRegistrosAberto(true)} className="rounded-xl border border-dashed border-[#1A3A6B]/25 bg-[#F8FAFC] px-4 py-4 text-center text-sm font-bold text-[#1A3A6B] transition hover:border-[#C9963A]/50 hover:bg-white">
                  Abrir lista completa com {numero(saidas.length)} registros
                </button>
              )}

              {saidas.length === 0 && (
                <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                  Nenhuma assistencia encontrada para os filtros selecionados.
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Duplas mais acompanhadas</h2>
            <p className="text-sm text-gray-400 mb-4">Ranking por repeticao de visitas no periodo.</p>
            <div className="space-y-3">
              {resumo.duplasMaisVisitadas.map((dupla, index) => (
                <button
                  key={dupla.id}
                  type="button"
                  onClick={() => navigate(`${prefix}/duplas/${dupla.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-[#F8FAFC] px-3 py-3 text-left transition hover:border-[#C9963A]/40 hover:bg-white"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-400">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-bold text-[#1A3A6B]">{dupla.nome}</span>
                    <span className="text-xs text-gray-400">{dupla.bairro}</span>
                  </span>
                  <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-bold text-[#0d9488]">{dupla.total}</span>
                </button>
              ))}
              {resumo.duplasMaisVisitadas.length === 0 && <p className="text-sm text-gray-400">Sem dados para exibir.</p>}
            </div>
          </section>
        </div>

        <section className="card">
          <h2 className="text-lg font-bold text-[#1A3A6B]">Resumo por semana</h2>
          <p className="text-sm text-gray-400 mb-4">Volume semanal das visitas de assistencia.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(dados?.porSemana || []).map((semana) => (
              <div key={semana.semanaInicio} className="rounded-xl border border-gray-100 bg-[#F8FAFC] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Semana de {formatarData(semana.semanaInicio)}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Info label="Saidas" valor={semana.saidas?.length || 0} />
                  <Info label="Duplas" valor={semana.totalDuplas || 0} />
                </div>
              </div>
            ))}
            {(dados?.porSemana || []).length === 0 && <p className="text-sm text-gray-400">Sem semanas no periodo.</p>}
          </div>
        </section>
      </div>

      {modalRegistrosAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setModalRegistrosAberto(false)}>
          <div className="w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex flex-col gap-3 border-b border-gray-100 bg-[#F8FAFC] p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Registros de assistencia</p>
                <h3 className="mt-1 text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  Todos os acompanhamentos
                </h3>
                <p className="mt-1 text-sm text-gray-400">{numero(saidas.length)} registro{saidas.length === 1 ? '' : 's'} no periodo selecionado.</p>
              </div>
              <button type="button" onClick={() => setModalRegistrosAberto(false)} className="flex h-11 w-11 items-center justify-center self-end rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#1A3A6B] sm:self-auto" aria-label="Fechar">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3">
                {saidas.map((saida) => (
                  <button
                    key={`modal-${saida.id}`}
                    type="button"
                    onClick={() => {
                      setModalRegistrosAberto(false);
                      setRegistroSelecionado(saida);
                    }}
                    className="w-full overflow-hidden rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-[#C9963A]/40 hover:shadow-md"
                  >
                    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[8rem_minmax(12rem,1fr)_6rem_minmax(8rem,.85fr)_minmax(0,1.35fr)] lg:items-start">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Data</p>
                        <p className="font-bold text-[#1A3A6B]">{formatarData(saida.dataSaida)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Coordenador</p>
                        <p className="break-words font-semibold leading-snug text-gray-700">{saida.coordenador?.nome || 'Sem coordenador'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Duplas</p>
                        <p className="text-2xl font-bold text-[#0d9488]">{numero(saida.duplas?.length || 0)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Semana</p>
                        <p className="font-semibold text-gray-600">{formatarData(saida.semanaInicio)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Relato</p>
                        <p className="line-clamp-2 max-w-full break-words text-sm leading-snug text-gray-500 [overflow-wrap:anywhere]">{saida.observacoes || 'Sem relato informado.'}</p>
                      </div>
                    </div>
                  </button>
                ))}

                {saidas.length === 0 && (
                  <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                    Nenhuma assistencia encontrada para os filtros selecionados.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 bg-[#F8FAFC] p-4">
              <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/relatorios/coordenador-regional`)}>
                Relatorio regional
              </button>
              <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setModalRegistrosAberto(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {registroSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setRegistroSelecionado(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-[#F8FAFC] p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Detalhe da assistencia</p>
                <h3 className="mt-1 text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {formatarData(registroSelecionado.dataSaida)}
                </h3>
                <p className="mt-1 text-sm text-gray-400">{registroSelecionado.coordenador?.nome || 'Sem coordenador'}</p>
              </div>
              <button type="button" onClick={() => setRegistroSelecionado(null)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#1A3A6B]" aria-label="Fechar">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Info label="Data" valor={formatarData(registroSelecionado.dataSaida)} />
                <Info label="Duplas" valor={registroSelecionado.duplas?.length || 0} />
                <Info label="Semana" valor={formatarData(registroSelecionado.semanaInicio)} />
              </div>

              <div className="mt-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Relato / observacoes</h4>
                <p className="mt-2 rounded-lg bg-[#F4F5F7] p-4 text-sm leading-relaxed text-gray-600">
                  {registroSelecionado.observacoes || 'Nenhum relato foi preenchido neste acompanhamento.'}
                </p>
              </div>

              <div className="mt-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Duplas acompanhadas</h4>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(registroSelecionado.duplas || []).map((item) => (
                    <button
                      key={`${registroSelecionado.id}-${item.dupla?.id || item.id}`}
                      type="button"
                      onClick={() => item.dupla?.id && navigate(`${prefix}/duplas/${item.dupla.id}`)}
                      className="rounded-lg border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-[#C9963A]/40"
                    >
                      <p className="break-words text-sm font-bold text-[#1A3A6B]">{nomeDupla(item.dupla)}</p>
                      <p className="mt-1 text-xs text-gray-400">{item.dupla?.bairro || 'Sem bairro'}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 bg-[#F8FAFC] p-4">
              <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setRegistroSelecionado(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
