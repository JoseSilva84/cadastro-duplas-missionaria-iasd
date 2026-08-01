import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import BackButton from '../components/BackButton';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const formatarData = (valor) => {
  if (!valor) return 'Sem registro';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Sem registro';
  return data.toLocaleDateString('pt-BR');
};

const Icone = ({ children, cor = '#1A3A6B' }) => (
  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cor}12`, color: cor }}>
    {children}
  </div>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20a4 4 0 00-8 0M12 12a4 4 0 100-8 4 4 0 000 8zm7 8a3 3 0 00-4.5-2.6M5 20a3 3 0 014.5-2.6M18 11a3 3 0 100-6M6 11a3 3 0 110-6" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-7 4h8m-8 4h8m-8 4h5M9 3h6a2 2 0 012 2h1a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h1a2 2 0 012-2z" />
  </svg>
);

const VisitIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7-7.5 10.5-7.5 10.5S4.5 17.5 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m4 14v-7m4 7V8m4 11v-4m4 4H4" />
  </svg>
);

function Indicador({ label, valor, detalhe, tooltip, cor, icon }) {
  return (
    <div
      className="smart-tooltip bg-white border border-gray-100 rounded-lg p-4 shadow-sm"
      data-tooltip={tooltip || detalhe || `${label}: total consolidado conforme os acompanhamentos registrados.`}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <Icone cor={cor}>{icon}</Icone>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight" style={{ color: cor }}>{numero(valor)}</p>
          <p className="text-sm font-semibold text-[#1A3A6B] mt-1">{label}</p>
          {detalhe && <p className="text-xs text-gray-400 mt-1">{detalhe}</p>}
        </div>
      </div>
    </div>
  );
}

function Painel({ titulo, subtitulo, cor, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible">
      <div className="px-5 py-4 border-b border-gray-100" style={{ borderTop: `4px solid ${cor}` }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: cor }}>{subtitulo}</p>
        <h2 className="text-xl font-bold text-[#1A3A6B] mt-1" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Ranking({ titulo, itens = [], campo, label, cor }) {
  return (
    <div className="bg-[#F4F5F7] rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-[#1A3A6B] mb-3">{titulo}</h3>
      <div className="space-y-2">
        {itens.length ? itens.map((item, index) => (
          <div
            key={`${titulo}-${item.id}`}
            className="smart-tooltip bg-white rounded-lg border border-gray-100 px-3 py-3 flex items-center gap-3"
            data-tooltip={`${titulo}: ${item.nome} possui ${numero(item[campo])} ${label}.`}
            tabIndex={0}
          >
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">{index + 1}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1A3A6B] truncate">{item.nome}</p>
              <p className="text-xs text-gray-400 truncate">{item.regiao}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold leading-tight" style={{ color: cor }}>{numero(item[campo])}</p>
              <p className="text-[10px] text-gray-400 uppercase">{label}</p>
            </div>
          </div>
        )) : <p className="text-sm text-gray-400">Sem dados para exibir.</p>}
      </div>
    </div>
  );
}

export default function DashboardCoordenadorRegional() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [modalCoordenador, setModalCoordenador] = useState(null);

  useEffect(() => {
    api.get('/relatorios/coordenadores-regionais')
      .then((res) => setDados(res.data))
      .finally(() => setCarregando(false));
  }, []);

  const resumo = dados?.resumo || {};
  const rankings = dados?.rankings || {};
  const coordenadores = dados?.coordenadores || [];
  const recentes = dados?.recentes || [];

  const coordenadoresOrdenados = useMemo(() => (
    [...coordenadores].sort((a, b) => b.totalAssistencias - a.totalAssistencias || a.nome.localeCompare(b.nome))
  ), [coordenadores]);

  const montarModalCoordenador = (coordenador, indicador, assistencias = [], extras = {}) => {
    const coordenadoresDaRegiao = coordenadores.filter((item) => (
      coordenador.regiaoId ? item.regiaoId === coordenador.regiaoId : item.regiao === coordenador.regiao
    ));
    const assistenciasBase = assistencias.length ? assistencias : coordenadoresDaRegiao
      .flatMap((item) => (item.assistencias || []).map((assistencia) => ({
        ...assistencia,
        coordenadorNome: item.nome,
        coordenadorEmail: item.email,
      })))
      .sort((a, b) => new Date(b.dataSaida) - new Date(a.dataSaida));
    const duplaIds = new Set();
    assistenciasBase.forEach((assistencia) => {
      (assistencia.duplas || []).forEach((dupla) => {
        if (dupla.id) duplaIds.add(dupla.id);
      });
    });

    return {
      coordenador: {
        ...coordenador,
        nome: coordenador.regiao,
        email: `${coordenadoresDaRegiao.length} coordenador${coordenadoresDaRegiao.length === 1 ? '' : 'es'} regional${coordenadoresDaRegiao.length === 1 ? '' : 'is'}`,
        totalAssistencias: assistenciasBase.length || coordenador.totalAssistencias,
        totalDuplasAcompanhadas: assistenciasBase.length ? assistenciasBase.reduce((acc, item) => acc + Number(item.totalDuplas || 0), 0) : coordenador.totalDuplasAcompanhadas,
        duplasUnicas: assistenciasBase.length ? duplaIds.size : coordenador.duplasUnicas,
        relatoriosPreenchidos: assistenciasBase.length ? assistenciasBase.filter((item) => String(item.observacoes || '').trim()).length : coordenador.relatoriosPreenchidos,
        ultimoAcompanhamento: assistenciasBase[0]?.dataSaida || coordenador.ultimoAcompanhamento,
        assistencias: assistenciasBase,
      },
      indicador,
      ...extras,
    };
  };

  const normalizarAssistencias = (dadosRelatorio, coordenador) => (
    (dadosRelatorio?.porSemana || [])
      .flatMap((semana) => (semana.saidas || []).map((saida) => ({
        id: saida.id,
        dataSaida: saida.dataSaida,
        observacoes: saida.observacoes || null,
        totalDuplas: saida.duplas?.length || 0,
        coordenadorNome: saida.coordenador?.nome || coordenador.nome,
        coordenadorEmail: coordenador.email,
        duplas: (saida.duplas || []).map((item) => ({
          id: item.dupla?.id,
          nome: item.dupla ? `${item.dupla.liderNome || 'Líder'} + ${item.dupla.membro2Nome || 'Membro'}` : 'Dupla não encontrada',
          bairro: item.dupla?.bairro || '',
          distrito: item.dupla?.distrito?.nome || '',
        })),
      })))
      .sort((a, b) => new Date(b.dataSaida) - new Date(a.dataSaida))
  );

  const abrirDetalhesCoordenador = async (coordenador, indicador) => {
    setModalCoordenador(montarModalCoordenador(coordenador, indicador, [], { carregandoAssistencias: true, erroAssistencias: '' }));

    try {
      const res = await api.get('/relatorios/acompanhamento', { params: { coordenadorId: coordenador.id } });
      const assistencias = normalizarAssistencias(res.data, coordenador);
      setModalCoordenador(montarModalCoordenador(coordenador, indicador, assistencias, { carregandoAssistencias: false, erroAssistencias: '' }));
    } catch (err) {
      setModalCoordenador((atual) => atual ? {
        ...atual,
        carregandoAssistencias: false,
        erroAssistencias: err.response?.data?.erro || 'Nao foi possivel carregar as assistencias detalhadas.',
      } : atual);
    }
  };

  if (carregando) return <LoadingState mensagem="Carregando dashboard..." />;

  return (
    <div className={isDireto ? 'h-full overflow-y-auto bg-[#F4F5F7] p-4 sm:p-6 animate-fade-in' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className="mb-6">
        <BackButton fallbackTo={isDireto ? '/direto/relatorios' : '/relatorios'} className="mb-3" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Relatório</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Coordenador Regional
        </h1>
        <p className="text-gray-400 text-sm mt-1">Informações e desempenho dos acompanhamentos realizados pelos coordenadores regionais.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <Indicador label="Coordenadores ativos" valor={resumo.totalCoordenadores} tooltip="Coordenadores ativos: total de usuarios ativos com perfil de coordenador regional." cor="#1A3A6B" icon={<UsersIcon />} />
        <Indicador label="Assistências registradas" valor={resumo.totalAssistencias} tooltip="Assistencias registradas: total de saidas/acompanhamentos cadastrados pelos coordenadores." cor="#C9963A" icon={<VisitIcon />} />
        <Indicador label="Duplas acompanhadas" valor={resumo.totalDuplasAcompanhadas} detalhe="contagem total, incluindo repetições" tooltip="Duplas acompanhadas: soma de todas as duplas visitadas nas assistências, incluindo repetições quando a mesma dupla aparece em mais de uma saída." cor="#0d9488" icon={<ChartIcon />} />
        <Indicador label="Relatórios preenchidos" valor={resumo.totalRelatorios} tooltip="Relatórios preenchidos: quantidade de assistências que possuem observações ou relato registrado." cor="#7B2D8B" icon={<ClipboardIcon />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Painel titulo="Dashboard de Acompanhamentos" subtitulo="Rankings" cor="#1A3A6B">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Ranking titulo="Mais assistências" itens={rankings.porAssistencias} campo="totalAssistencias" label="assist." cor="#1A3A6B" />
            <Ranking titulo="Mais duplas acompanhadas" itens={rankings.porDuplasAcompanhadas} campo="totalDuplasAcompanhadas" label="duplas" cor="#0d9488" />
            <Ranking titulo="Mais duplas únicas" itens={rankings.porDuplasUnicas} campo="duplasUnicas" label="únicas" cor="#C9963A" />
            <Ranking titulo="Mais relatórios preenchidos" itens={rankings.porRelatorios} campo="relatoriosPreenchidos" label="relat." cor="#7B2D8B" />
          </div>
        </Painel>

        <Painel titulo="Informações dos Coordenadores" subtitulo="Coordenação regional" cor="#C9963A">
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {coordenadoresOrdenados.length ? coordenadoresOrdenados.map((coordenador) => (
              <div key={coordenador.id} className="bg-[#F4F5F7] rounded-lg border border-gray-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1A3A6B] truncate">{coordenador.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{coordenador.email}</p>
                    <p className="text-xs font-semibold text-[#C9963A] mt-1">{coordenador.regiao}</p>
                  </div>
                  <button type="button" onClick={() => navigate(isDireto ? '/direto/registro-saida' : '/registro-saida')} className="btn-outline text-xs px-3 py-2">
                    Registrar assistência
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <button type="button" onClick={() => abrirDetalhesCoordenador(coordenador, `Assistências da ${coordenador.regiao}`)} className="cursor-pointer rounded-lg bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C9963A]/25"><p className="text-lg font-bold text-[#1A3A6B]">{numero(coordenador.totalAssistencias)}</p><p className="text-[10px] text-gray-400 uppercase">assistências</p></button>
                  <button type="button" onClick={() => abrirDetalhesCoordenador(coordenador, `Duplas acompanhadas - ${coordenador.regiao}`)} className="cursor-pointer rounded-lg bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C9963A]/25"><p className="text-lg font-bold text-[#0d9488]">{numero(coordenador.totalDuplasAcompanhadas)}</p><p className="text-[10px] text-gray-400 uppercase">duplas</p></button>
                  <button type="button" onClick={() => abrirDetalhesCoordenador(coordenador, `Duplas únicas - ${coordenador.regiao}`)} className="cursor-pointer rounded-lg bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C9963A]/25"><p className="text-lg font-bold text-[#C9963A]">{numero(coordenador.duplasUnicas)}</p><p className="text-[10px] text-gray-400 uppercase">únicas</p></button>
                  <button type="button" onClick={() => abrirDetalhesCoordenador(coordenador, `Relatórios preenchidos - ${coordenador.regiao}`)} className="cursor-pointer rounded-lg bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C9963A]/25"><p className="text-lg font-bold text-[#7B2D8B]">{numero(coordenador.relatoriosPreenchidos)}</p><p className="text-[10px] text-gray-400 uppercase">relatórios</p></button>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  Último acompanhamento: <span className="font-semibold text-gray-600">{formatarData(coordenador.ultimoAcompanhamento)}</span>
                  {coordenador.distritoMaisVisitado && (
                    <span> · Distrito mais visitado: <span className="font-semibold text-gray-600">{coordenador.distritoMaisVisitado.nome}</span></span>
                  )}
                </div>
              </div>
            )) : <p className="text-sm text-gray-400">Nenhum coordenador regional ativo encontrado.</p>}
          </div>
        </Painel>
      </div>

      <div className="mt-5">
        <Painel titulo="Últimos Acompanhamentos" subtitulo="Histórico recente" cor="#0d9488">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recentes.length ? recentes.map((item) => (
              <div key={item.id} className="bg-[#F4F5F7] rounded-lg border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1A3A6B] truncate">{item.coordenador}</p>
                    <p className="text-xs text-gray-400">{item.regiao} · {formatarData(item.dataSaida)}</p>
                  </div>
                  <span className="smart-tooltip px-2.5 py-1 rounded-full bg-white text-[#0d9488] text-xs font-bold" data-tooltip="Total de duplas vinculadas a este acompanhamento recente." tabIndex={0}>{numero(item.totalDuplas)} duplas</span>
                </div>
                {item.relatorio && <p className="text-sm text-gray-600 mt-3 line-clamp-3">{item.relatorio}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.duplas.slice(0, 3).map((dupla) => (
                    <span key={`${item.id}-${dupla.id || dupla.nome}`} className="px-2 py-1 rounded-full bg-white text-[10px] font-semibold text-gray-500">
                      {dupla.nome}
                    </span>
                  ))}
                </div>
              </div>
            )) : <p className="text-sm text-gray-400">Nenhum acompanhamento registrado.</p>}
          </div>
        </Painel>
      </div>

      {modalCoordenador && (
        <div className="app-modal-overlay" onClick={() => setModalCoordenador(null)}>
          <div className="app-modal-panel max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal-header flex-col sm:flex-row">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">{modalCoordenador.indicador}</p>
                <h3 className="mt-1 break-words text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {modalCoordenador.coordenador.nome}
                </h3>
                <p className="mt-1 break-words text-sm text-gray-400">{modalCoordenador.coordenador.email}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#C9963A]">{modalCoordenador.coordenador.regiao}</p>
              </div>
              <button type="button" onClick={() => setModalCoordenador(null)} className="flex h-11 w-11 items-center justify-center self-end rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#1A3A6B] sm:self-auto" aria-label="Fechar">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="app-modal-body">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                <div className="rounded-lg bg-[#F4F5F7] p-3"><p className="text-lg font-bold text-[#1A3A6B]">{numero(modalCoordenador.coordenador.totalAssistencias)}</p><p className="text-[10px] uppercase text-gray-400">assistencias</p></div>
                <div className="rounded-lg bg-[#F4F5F7] p-3"><p className="text-lg font-bold text-[#0d9488]">{numero(modalCoordenador.coordenador.totalDuplasAcompanhadas)}</p><p className="text-[10px] uppercase text-gray-400">duplas</p></div>
                <div className="rounded-lg bg-[#F4F5F7] p-3"><p className="text-lg font-bold text-[#C9963A]">{numero(modalCoordenador.coordenador.duplasUnicas)}</p><p className="text-[10px] uppercase text-gray-400">unicas</p></div>
                <div className="rounded-lg bg-[#F4F5F7] p-3"><p className="text-lg font-bold text-[#7B2D8B]">{numero(modalCoordenador.coordenador.relatoriosPreenchidos)}</p><p className="text-[10px] uppercase text-gray-400">relatórios</p></div>
              </div>

              <div className="mt-4 rounded-lg bg-[#F4F5F7] p-4 text-sm text-gray-500">
                Ultimo acompanhamento: <span className="font-semibold text-gray-700">{formatarData(modalCoordenador.coordenador.ultimoAcompanhamento)}</span>
                {modalCoordenador.coordenador.distritoMaisVisitado && (
                  <span> - Distrito mais visitado: <span className="font-semibold text-gray-700">{modalCoordenador.coordenador.distritoMaisVisitado.nome}</span></span>
                )}
              </div>

              {modalCoordenador.carregandoAssistencias && (
                <div className="mt-5 rounded-xl bg-[#F4F5F7] px-4 py-8 text-center text-sm font-semibold text-gray-500">
                  Carregando assistências registradas...
                </div>
              )}

              {modalCoordenador.erroAssistencias && (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-sm font-semibold text-red-600">
                  {modalCoordenador.erroAssistencias}
                </div>
              )}

              <div className="mt-5 space-y-3">
                {(modalCoordenador.coordenador.assistencias || []).map((assistencia) => (
                  <div key={assistencia.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[8rem_minmax(10rem,.9fr)_7rem_minmax(0,1fr)] lg:items-start">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Data</p>
                        <p className="font-bold text-[#1A3A6B]">{formatarData(assistencia.dataSaida)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Coordenador</p>
                        <p className="break-words text-sm font-semibold leading-snug text-gray-600">{assistencia.coordenadorNome || modalCoordenador.coordenador.nome}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Duplas</p>
                        <p className="text-2xl font-bold text-[#0d9488]">{numero(assistencia.totalDuplas)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Relato</p>
                        <p className="mt-1 break-words text-sm leading-relaxed text-gray-600 [overflow-wrap:anywhere]">{assistencia.observacoes || 'Sem relato informado.'}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Duplas acompanhadas</p>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(assistencia.duplas || []).map((dupla) => (
                          <button
                            key={`${assistencia.id}-${dupla.id || dupla.nome}`}
                            type="button"
                            onClick={() => dupla.id && navigate(isDireto ? `/direto/duplas/${dupla.id}` : `/duplas/${dupla.id}`)}
                            className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-left transition hover:bg-[#F4F5F7]"
                          >
                            <p className="break-words text-sm font-bold text-[#1A3A6B]">{dupla.nome}</p>
                            <p className="text-xs text-gray-400">{dupla.distrito || dupla.bairro || 'Sem local informado'}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {!modalCoordenador.carregandoAssistencias && !modalCoordenador.erroAssistencias && (modalCoordenador.coordenador.assistencias || []).length === 0 && (
                  <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                    Nenhuma assistencia registrada para este coordenador.
                  </div>
                )}
              </div>
            </div>

            <div className="app-modal-footer">
              <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setModalCoordenador(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
