import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import EChart from '../components/EChart';
import MapaIgrejaResumo, { somarMapasIgreja, ESTRUTURA_CARDS_BASE } from '../components/MapaIgrejaResumo';
import { toast } from '../lib/toast';

const cores = ['#1A3A6B', '#0d9488', '#7c3aed', '#ea580c', '#dc2626', '#C9963A'];

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const normalizarTexto = (valor = '') =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseDataSegura = (valor) => {
  if (!valor) return null;
  const str = String(valor).trim();
  const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    const d = new Date(Number(matchIso[1]), Number(matchIso[2]) - 1, Number(matchIso[3]), 12, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const matchBr = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (matchBr) {
    const d = new Date(Number(matchBr[3]), Number(matchBr[2]) - 1, Number(matchBr[1]), 12, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
};

const formatarData = (valor) => {
  if (!valor) return 'Não informado';
  const str = String(valor).trim();
  const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
  }
  const data = new Date(str);
  if (Number.isNaN(data.getTime())) return 'Não informado';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const inicioDaSemanaDomingo = (data) => {
  const d = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
};

const fimDaSemanaSabado = (inicio) => {
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 23, 59, 59, 999);
  d.setDate(d.getDate() + 6);
  return d;
};

const chaveIsoCurta = (data) => {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, '0');
  const d = String(data.getDate()).padStart(2, '0');
  return `${a}-${m}-${d}`;
};

const formatarCurto = (data) => {
  const d = String(data.getDate()).padStart(2, '0');
  const m = String(data.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
};

// ── Componente de Select com Busca Inteligente ─────────────────────────────
const FiltroBuscaInteligente = ({
  label,
  placeholder,
  value,
  onChange,
  options = [],
  emptyText = 'Nenhuma opção encontrada',
}) => {
  const [aberto, setAberto] = useState(false);
  const [termo, setTermo] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const aoClicarFora = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, []);

  const selecionado = useMemo(
    () => options.find((opt) => String(opt.value) === String(value)) || null,
    [options, value]
  );

  const opcoesFiltradas = useMemo(() => {
    const busca = normalizarTexto(termo);
    if (!busca) return options;
    return options.filter(
      (opt) =>
        normalizarTexto(opt.label).includes(busca) ||
        normalizarTexto(opt.sublabel || '').includes(busca)
    );
  }, [options, termo]);

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <div
        onClick={() => setAberto((v) => !v)}
        className={`flex min-h-[38px] cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-xs transition-all ${
          selecionado
            ? 'border-[#1A3A6B] bg-[#1A3A6B]/5 font-bold text-[#1A3A6B]'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
        }`}
      >
        <span className="truncate">
          {selecionado ? selecionado.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selecionado && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setTermo('');
              }}
              className="rounded-full px-1 text-xs font-bold text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              title="Limpar seleção"
            >
              ✕
            </button>
          )}
          <span className="text-[10px] text-slate-400">{aberto ? '▲' : '▼'}</span>
        </div>
      </div>

      {aberto && (
        <div className="absolute left-0 right-0 z-40 mt-1 max-h-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              autoFocus
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Digite para pesquisar..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#1A3A6B] focus:bg-white focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setTermo('');
                setAberto(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                !value ? 'bg-[#1A3A6B]/10 font-bold text-[#1A3A6B]' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{placeholder}</span>
              <span className="text-[10px] text-slate-400">{options.length}</span>
            </button>
            {opcoesFiltradas.map((opt) => {
              const ativo = String(opt.value) === String(value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(String(opt.value));
                    setAberto(false);
                  }}
                  className={`mt-0.5 flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors ${
                    ativo ? 'bg-[#1A3A6B] text-white' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold">{opt.label}</span>
                    {opt.badge !== undefined && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ativo ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {opt.badge}
                      </span>
                    )}
                  </div>
                  {opt.sublabel && (
                    <span className={`truncate text-[10px] ${ativo ? 'text-white/80' : 'text-slate-400'}`}>
                      {opt.sublabel}
                    </span>
                  )}
                </button>
              );
            })}
            {opcoesFiltradas.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-slate-400">{emptyText}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Card de Indicador Interativo (Topo e Mapa) ─────────────────────────────
const CardIndicador = ({ label, valor, cor, detalhe, ativo = false, onClick = null, subtextoAcao = null }) => {
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`group flex w-full flex-col justify-between rounded-xl border bg-white p-3 sm:p-4 text-left shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#C9963A]/60 hover:shadow-2xl hover:shadow-[#1A3A6B]/10 ${
        onClick ? 'cursor-pointer' : ''
      } ${ativo ? 'ring-2 shadow-lg' : ''}`}
      style={{
        borderColor: ativo ? cor : `${cor}35`,
        ...(ativo ? { '--tw-ring-color': `${cor}40` } : {}),
      }}
    >
      <div className="w-full">
        <div className="mb-2 sm:mb-4 flex items-center justify-between gap-2">
          <div
            className="flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg"
            style={{ backgroundColor: cor }}
          >
            <span className="text-sm sm:text-lg font-bold">{String(label).charAt(0)}</span>
          </div>
          {onClick && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                ativo
                  ? 'bg-[#1A3A6B] text-white'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-[#C9963A]/15 group-hover:text-[#C9963A]'
              }`}
            >
              {ativo ? 'Ocultar ▲' : subtextoAcao || 'Explorar ▼'}
            </span>
          )}
        </div>
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 transition-colors duration-300 group-hover:text-[#1A3A6B] line-clamp-1">
          {label}
        </p>
        <p
          className="mt-0.5 sm:mt-1 text-2xl sm:text-3xl font-black leading-none tracking-tight transition-transform duration-300 group-hover:translate-x-0.5"
          style={{ color: cor }}
        >
          {valor}
        </p>
      </div>
      {detalhe && <p className="mt-2 text-[10px] sm:text-xs text-slate-400 line-clamp-1">{detalhe}</p>}
    </Tag>
  );
};

const LinhaLideranca = ({ label, valor }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 sm:p-3">
    <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">{label}</p>
    <p className="mt-0.5 sm:mt-1 truncate text-xs sm:text-base font-bold text-[#1A3A6B]">{valor || 'Não informado'}</p>
  </div>
);

const MapaCard = ({ mapa, onEditar, onExcluir, excluindo, destacada = false, onLimparDestaque = null }) => {
  const igreja = mapa.igreja || {};
  const indicadores = [
    ['Pequeno Grupo', mapa.quantidadePequenosGrupos, '#C9963A'],
    ['Semana Santa', mapa.semanaSanta, '#0d9488'],
    ['Classe Bíblica', mapa.classeBiblica, '#7c3aed'],
    ['Aventureiros', mapa.aventureiros, '#0284c7'],
    ['Duplas Missionárias', igreja._count?.duplas || 0, '#1A3A6B'],
    ['Desbravadores', mapa.desbravadores, '#dc2626'],
  ];
  const acoes = Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias : [];

  return (
    <section
      id={`mapa-igreja-${mapa.igrejaId || igreja.id}`}
      className={`group rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:border-[#C9963A]/60 hover:shadow-2xl hover:shadow-[#1A3A6B]/10 sm:p-5 ${
        destacada ? 'border-[#C9963A] ring-2 ring-[#C9963A]/30 shadow-xl' : 'border-[#1A3A6B]/10'
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Mapa da Igreja</p>
            {destacada && (
              <span className="rounded-full bg-[#C9963A]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C9963A]">
                Igreja selecionada
              </span>
            )}
          </div>
          <h2 className="mt-1 break-words text-2xl font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>
            {igreja.nome}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {igreja.distrito?.nome || 'Sem distrito'} · {igreja.distrito?.regiao?.nome || 'Sem região'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {destacada && onLimparDestaque && (
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              onClick={onLimparDestaque}
            >
              ← Ver todas as igrejas
            </button>
          )}
          <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => onEditar(mapa)}>Editar cadastro</button>
          <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" disabled={excluindo} onClick={() => onExcluir(mapa)}>
            {excluindo ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
        <LinhaLideranca label="Pastor" valor={mapa.pastorNome} />
        <LinhaLideranca label="Diretor Missionário" valor={mapa.diretorMissionarioNome} />
        <LinhaLideranca label="Primeiro Ancião" valor={mapa.primeiroAnciaoNome} />
        <LinhaLideranca label="Ano que se tornou igreja" valor={mapa.anoOrganizacao} />
        <LinhaLideranca label="Membros da igreja" valor={numero(igreja.membros)} />
        <LinhaLideranca label="Evangelismo de colheita" valor={formatarData(mapa.dataEvangelismoColheita)} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {indicadores.map(([label, valor, cor]) => (
          <CardIndicador key={label} label={label} valor={numero(valor)} cor={cor} />
        ))}
      </div>

      <div className="group/actions relative mt-5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all duration-500 ease-out hover:border-[#C9963A]/50 hover:bg-white hover:shadow-xl">
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Ações missionárias</p>
            <h3 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Planejamento local
            </h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
            {acoes.length} ação(ões)
          </span>
        </div>
        <div className="relative mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {acoes.map((acao, index) => (
            <div key={`${acao.nome}-${index}`} className="group/action rounded-xl border border-white bg-white p-3 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C9963A]/40 hover:shadow-lg">
              <p className="font-bold text-[#1A3A6B] transition-colors duration-300 group-hover/action:text-[#C9963A]">{acao.nome}</p>
              <p className="mt-1 text-sm text-slate-400">{acao.responsavel || 'Sem responsável'}</p>
              <p className="mt-3 inline-flex rounded-full bg-[#C9963A]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-[#C9963A]">{formatarData(acao.data)}</p>
            </div>
          ))}
          {acoes.length === 0 && (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-400 md:col-span-2 xl:col-span-3">Nenhuma ação missionária cadastrada.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default function MapaIgreja() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';

  const [mapas, setMapas] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [excluindoId, setExcluindoId] = useState(null);

  // Painel interativo de topo ao clicar nos cards ("igrejas", "membros", "pequenosGrupos", "acoes")
  const [painelKpiAtivo, setPainelKpiAtivo] = useState(null);
  const [abaIgrejasPainel, setAbaIgrejasPainel] = useState('mapeadas'); // 'mapeadas' | 'pendentes'
  const [buscaPainelTopo, setBuscaPainelTopo] = useState('');

  // Filtros inteligentes principais
  const [busca, setBusca] = useState('');
  const [filtroRegiaoId, setFiltroRegiaoId] = useState('');
  const [filtroDistritoId, setFiltroDistritoId] = useState('');
  const [filtroIgrejaId, setFiltroIgrejaId] = useState('');
  const [filtroAcaoChave, setFiltroAcaoChave] = useState('');
  const [filtroEstrutura, setFiltroEstrutura] = useState('');
  const [ordenacaoMapas, setOrdenacaoMapas] = useState('nome'); // 'nome' | 'pg' | 'acoes' | 'membros' | 'recentes'

  // Filtros de período (Todos, Ano, Mês, Semana, Personalizado)
  const anoAtualPadrao = new Date().getFullYear();
  const [modoPeriodo, setModoPeriodo] = useState('todos'); // 'todos' | 'ano' | 'mes' | 'semana' | 'personalizado'
  const [anoSelecionado, setAnoSelecionado] = useState(String(anoAtualPadrao));
  const [mesSelecionado, setMesSelecionado] = useState(String(new Date().getMonth() + 1));
  const [semanaSelecionada, setSemanaSelecionada] = useState('');
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState('');
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState('');

  // Indicador expandido no MapaIgrejaResumo
  const [indicadorResumoAtivo, setIndicadorResumoAtivo] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/mapa-igreja'), api.get('/igrejas')])
      .then(([mapasRes, igrejasRes]) => {
        setMapas(Array.isArray(mapasRes.data) ? mapasRes.data : []);
        setIgrejas(Array.isArray(igrejasRes.data) ? igrejasRes.data : []);
      })
      .finally(() => setCarregando(false));
  }, []);

  // Lista completa de ações missionárias enriquecidas com dados da igreja
  const todasAcoesEnriquecidas = useMemo(() => {
    const lista = [];
    mapas.forEach((mapa) => {
      const igreja = mapa.igreja || {};
      const acoes = Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias : [];
      acoes.forEach((acao, idx) => {
        const dataObj = parseDataSegura(acao.data);
        const inicioSemana = dataObj ? inicioDaSemanaDomingo(dataObj) : null;
        const fimSemana = inicioSemana ? fimDaSemanaSabado(inicioSemana) : null;
        lista.push({
          ...acao,
          idUnico: `${mapa.id}-${idx}-${acao.nome || ''}`,
          mapaId: mapa.id,
          igrejaId: mapa.igrejaId || igreja.id,
          igrejaNome: igreja.nome || 'Sem igreja',
          distritoId: igreja.distrito?.id || igreja.distritoId || null,
          distritoNome: igreja.distrito?.nome || 'Sem distrito',
          regiaoId: igreja.distrito?.regiao?.id || null,
          regiaoNome: igreja.distrito?.regiao?.nome || 'Sem região',
          pastorNome: mapa.pastorNome || igreja.distrito?.nomePastor || '',
          dataObj,
          ano: dataObj ? String(dataObj.getFullYear()) : null,
          mes: dataObj ? String(dataObj.getMonth() + 1) : null,
          semanaChave: inicioSemana ? chaveIsoCurta(inicioSemana) : null,
          semanaRotulo: inicioSemana && fimSemana ? `${formatarCurto(inicioSemana)} a ${formatarCurto(fimSemana)}/${inicioSemana.getFullYear()}` : null,
        });
      });
    });
    return lista;
  }, [mapas]);

  // Anos, meses e semanas disponíveis nas ações e evangelismo de colheita
  const anosDisponiveis = useMemo(() => {
    const anos = new Set([String(anoAtualPadrao)]);
    todasAcoesEnriquecidas.forEach((a) => {
      if (a.ano) anos.add(a.ano);
    });
    mapas.forEach((m) => {
      const d = parseDataSegura(m.dataEvangelismoColheita);
      if (d) anos.add(String(d.getFullYear()));
    });
    return Array.from(anos).sort((a, b) => Number(b) - Number(a));
  }, [todasAcoesEnriquecidas, mapas, anoAtualPadrao]);

  const contagemPorMesNoAno = useMemo(() => {
    const contagem = {};
    for (let m = 1; m <= 12; m += 1) contagem[String(m)] = 0;
    todasAcoesEnriquecidas.forEach((a) => {
      if (a.ano === String(anoSelecionado) && a.mes) {
        contagem[a.mes] = (contagem[a.mes] || 0) + 1;
      }
    });
    return contagem;
  }, [todasAcoesEnriquecidas, anoSelecionado]);

  const semanasComAcoes = useMemo(() => {
    const mapaSemanas = new Map();
    todasAcoesEnriquecidas.forEach((a) => {
      if (!a.semanaChave) return;
      if (anoSelecionado && a.ano !== String(anoSelecionado)) return;
      if (!mapaSemanas.has(a.semanaChave)) {
        mapaSemanas.set(a.semanaChave, {
          chave: a.semanaChave,
          rotulo: a.semanaRotulo,
          total: 0,
        });
      }
      mapaSemanas.get(a.semanaChave).total += 1;
    });
    return Array.from(mapaSemanas.values()).sort((a, b) => a.chave.localeCompare(b.chave));
  }, [todasAcoesEnriquecidas, anoSelecionado]);

  // Verifica se uma data passa pelo filtro de período ativo
  const dataPassaFiltroPeriodo = useMemo(() => {
    if (modoPeriodo === 'todos') return () => true;
    return (valorData) => {
      const d = valorData instanceof Date ? valorData : parseDataSegura(valorData);
      if (!d) return false;
      if (modoPeriodo === 'ano') {
        return String(d.getFullYear()) === String(anoSelecionado);
      }
      if (modoPeriodo === 'mes') {
        return (
          String(d.getFullYear()) === String(anoSelecionado) &&
          String(d.getMonth() + 1) === String(mesSelecionado)
        );
      }
      if (modoPeriodo === 'semana') {
        if (!semanaSelecionada) return String(d.getFullYear()) === String(anoSelecionado);
        const ini = chaveIsoCurta(inicioDaSemanaDomingo(d));
        return ini === semanaSelecionada;
      }
      if (modoPeriodo === 'personalizado') {
        const iso = chaveIsoCurta(d);
        if (dataInicioPersonalizada && iso < dataInicioPersonalizada) return false;
        if (dataFimPersonalizada && iso > dataFimPersonalizada) return false;
        return Boolean(dataInicioPersonalizada || dataFimPersonalizada);
      }
      return true;
    };
  }, [modoPeriodo, anoSelecionado, mesSelecionado, semanaSelecionada, dataInicioPersonalizada, dataFimPersonalizada]);

  // Opções inteligentes para os selects
  const opcoesRegioes = useMemo(() => {
    const map = new Map();
    mapas.forEach((m) => {
      const reg = m.igreja?.distrito?.regiao;
      if (!reg?.id) return;
      if (!map.has(reg.id)) {
        map.set(reg.id, { value: String(reg.id), label: reg.nome, badge: 0 });
      }
      map.get(reg.id).badge += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [mapas]);

  const opcoesDistritos = useMemo(() => {
    const map = new Map();
    mapas.forEach((m) => {
      const dist = m.igreja?.distrito;
      if (!dist?.id) return;
      if (filtroRegiaoId && String(dist.regiao?.id || dist.regiaoId) !== String(filtroRegiaoId)) return;
      if (!map.has(dist.id)) {
        map.set(dist.id, {
          value: String(dist.id),
          label: dist.nome,
          sublabel: dist.regiao?.nome || '',
          badge: 0,
        });
      }
      map.get(dist.id).badge += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [mapas, filtroRegiaoId]);

  const opcoesIgrejasMapeadas = useMemo(() => {
    return mapas
      .filter((m) => {
        if (filtroRegiaoId && String(m.igreja?.distrito?.regiao?.id) !== String(filtroRegiaoId)) return false;
        if (filtroDistritoId && String(m.igreja?.distrito?.id || m.igreja?.distritoId) !== String(filtroDistritoId)) return false;
        return true;
      })
      .map((m) => {
        const qtdPg = Number(m.quantidadePequenosGrupos || 0);
        const qtdAcoes = Array.isArray(m.acoesMissionarias) ? m.acoesMissionarias.length : 0;
        return {
          value: String(m.igrejaId || m.igreja?.id),
          label: m.igreja?.nome || 'Sem nome',
          sublabel: `${m.igreja?.distrito?.nome || 'Sem distrito'} · ${m.igreja?.distrito?.regiao?.nome || 'Sem região'} · ${qtdPg} PG(s)`,
          badge: `${qtdAcoes} ação(ões)`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [mapas, filtroRegiaoId, filtroDistritoId]);

  const gruposAcoesInteligentes = useMemo(() => {
    const map = new Map();
    todasAcoesEnriquecidas.forEach((acao) => {
      if (filtroRegiaoId && String(acao.regiaoId) !== String(filtroRegiaoId)) return;
      if (filtroDistritoId && String(acao.distritoId) !== String(filtroDistritoId)) return;
      if (filtroIgrejaId && String(acao.igrejaId) !== String(filtroIgrejaId)) return;
      if (modoPeriodo !== 'todos' && !dataPassaFiltroPeriodo(acao.dataObj)) return;

      const chave = normalizarTexto(acao.nome);
      if (!chave) return;
      if (!map.has(chave)) {
        map.set(chave, {
          chave,
          rotulo: String(acao.nome).trim(),
          total: 0,
          igrejas: new Set(),
          acoes: [],
        });
      }
      const item = map.get(chave);
      item.total += 1;
      if (acao.igrejaNome) item.igrejas.add(acao.igrejaNome);
      item.acoes.push(acao);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  }, [todasAcoesEnriquecidas, filtroRegiaoId, filtroDistritoId, filtroIgrejaId, modoPeriodo, dataPassaFiltroPeriodo]);

  const opcoesAcoesSelect = useMemo(
    () =>
      gruposAcoesInteligentes.map((g) => ({
        value: g.chave,
        label: g.rotulo,
        sublabel: `${g.igrejas.size} igreja(s): ${Array.from(g.igrejas).slice(0, 3).join(', ')}${g.igrejas.size > 3 ? '...' : ''}`,
        badge: g.total,
      })),
    [gruposAcoesInteligentes]
  );

  const opcoesEstruturaSelect = useMemo(() => {
    const contar = (fn) => mapas.filter(fn).length;
    return [
      { value: 'com_pg', label: 'Com Pequenos Grupos (> 0)', sublabel: 'Igrejas que possuem Pequenos Grupos', badge: contar((m) => Number(m.quantidadePequenosGrupos || 0) > 0) },
      { value: 'sem_pg', label: 'Sem Pequenos Grupos (0)', sublabel: 'Igrejas com 0 Pequenos Grupos cadastrados', badge: contar((m) => Number(m.quantidadePequenosGrupos || 0) === 0) },
      { value: 'com_semana_santa', label: 'Com Semana Santa (> 0)', sublabel: 'Igrejas com pontos de Semana Santa', badge: contar((m) => Number(m.semanaSanta || 0) > 0) },
      { value: 'com_classe_biblica', label: 'Com Classe Bíblica (> 0)', sublabel: 'Igrejas com Classes Bíblicas ativas', badge: contar((m) => Number(m.classeBiblica || 0) > 0) },
      { value: 'com_aventureiros', label: 'Com Aventureiros (> 0)', sublabel: 'Igrejas com clube de Aventureiros', badge: contar((m) => Number(m.aventureiros || 0) > 0) },
      { value: 'com_duplas', label: 'Com Duplas Missionárias (> 0)', sublabel: 'Igrejas com duplas cadastradas', badge: contar((m) => Number(m.igreja?._count?.duplas || 0) > 0) },
      { value: 'com_desbravadores', label: 'Com Desbravadores (> 0)', sublabel: 'Igrejas com clube de Desbravadores', badge: contar((m) => Number(m.desbravadores || 0) > 0) },
      { value: 'com_acoes', label: 'Com Ações Missionárias (> 0)', sublabel: 'Igrejas que cadastraram planejamento de ações', badge: contar((m) => Array.isArray(m.acoesMissionarias) && m.acoesMissionarias.length > 0) },
    ];
  }, [mapas]);

  // Filtragem principal dos Mapas da Igreja
  const filtrados = useMemo(() => {
    const termo = normalizarTexto(busca);

    const resultado = mapas
      .map((mapa) => {
        const acoesOriginais = Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias : [];
        const acoesFiltradasDoMapa = acoesOriginais.filter((acao) => {
          if (modoPeriodo !== 'todos' && !dataPassaFiltroPeriodo(acao.data)) return false;
          if (filtroAcaoChave && normalizarTexto(acao.nome) !== filtroAcaoChave) return false;
          return true;
        });

        return {
          ...mapa,
          acoesMissionariasFiltradas: acoesFiltradasDoMapa,
        };
      })
      .filter((mapa) => {
        const igreja = mapa.igreja || {};
        if (filtroRegiaoId && String(igreja.distrito?.regiao?.id) !== String(filtroRegiaoId)) return false;
        if (filtroDistritoId && String(igreja.distrito?.id || igreja.distritoId) !== String(filtroDistritoId)) return false;
        if (filtroIgrejaId && String(mapa.igrejaId || igreja.id) !== String(filtroIgrejaId)) return false;

        if (filtroEstrutura === 'com_pg' && Number(mapa.quantidadePequenosGrupos || 0) <= 0) return false;
        if (filtroEstrutura === 'sem_pg' && Number(mapa.quantidadePequenosGrupos || 0) > 0) return false;
        if (filtroEstrutura === 'com_semana_santa' && Number(mapa.semanaSanta || 0) <= 0) return false;
        if (filtroEstrutura === 'com_classe_biblica' && Number(mapa.classeBiblica || 0) <= 0) return false;
        if (filtroEstrutura === 'com_aventureiros' && Number(mapa.aventureiros || 0) <= 0) return false;
        if (filtroEstrutura === 'com_duplas' && Number(igreja._count?.duplas || 0) <= 0) return false;
        if (filtroEstrutura === 'com_desbravadores' && Number(mapa.desbravadores || 0) <= 0) return false;
        if (filtroEstrutura === 'com_acoes' && (!Array.isArray(mapa.acoesMissionarias) || mapa.acoesMissionarias.length === 0)) return false;

        if (filtroAcaoChave && mapa.acoesMissionariasFiltradas.length === 0) return false;

        if (modoPeriodo !== 'todos' && !filtroIgrejaId) {
          const colheitaNoPeriodo = dataPassaFiltroPeriodo(mapa.dataEvangelismoColheita);
          if (mapa.acoesMissionariasFiltradas.length === 0 && !colheitaNoPeriodo) return false;
        }

        if (!termo) return true;
        const bateIgreja =
          normalizarTexto(igreja.nome).includes(termo) ||
          normalizarTexto(igreja.distrito?.nome).includes(termo) ||
          normalizarTexto(igreja.distrito?.regiao?.nome).includes(termo) ||
          normalizarTexto(mapa.pastorNome).includes(termo) ||
          normalizarTexto(mapa.diretorMissionarioNome).includes(termo) ||
          normalizarTexto(mapa.primeiroAnciaoNome).includes(termo);

        const bateAcao = (Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias : []).some(
          (acao) =>
            normalizarTexto(acao.nome).includes(termo) ||
            normalizarTexto(acao.responsavel).includes(termo)
        );

        return bateIgreja || bateAcao;
      });

    return resultado.sort((a, b) => {
      if (ordenacaoMapas === 'pg') {
        return Number(b.quantidadePequenosGrupos || 0) - Number(a.quantidadePequenosGrupos || 0);
      }
      if (ordenacaoMapas === 'acoes') {
        return (b.acoesMissionarias?.length || 0) - (a.acoesMissionarias?.length || 0);
      }
      if (ordenacaoMapas === 'membros') {
        return Number(b.igreja?.membros || 0) - Number(a.igreja?.membros || 0);
      }
      if (ordenacaoMapas === 'recentes') {
        return new Date(b.atualizadoEm || 0) - new Date(a.atualizadoEm || 0);
      }
      return String(a.igreja?.nome || '').localeCompare(String(b.igreja?.nome || ''), 'pt-BR');
    });
  }, [
    mapas,
    busca,
    filtroRegiaoId,
    filtroDistritoId,
    filtroIgrejaId,
    filtroAcaoChave,
    filtroEstrutura,
    modoPeriodo,
    dataPassaFiltroPeriodo,
    ordenacaoMapas,
  ]);

  // Ações filtradas para o resumo consolidado
  const acoesFiltradasParaResumo = useMemo(() => {
    const idsMapasFiltrados = new Set(filtrados.map((m) => m.id));
    const termo = normalizarTexto(busca);
    return todasAcoesEnriquecidas.filter((acao) => {
      if (!idsMapasFiltrados.has(acao.mapaId)) return false;
      if (modoPeriodo !== 'todos' && !dataPassaFiltroPeriodo(acao.dataObj)) return false;
      if (filtroAcaoChave && normalizarTexto(acao.nome) !== filtroAcaoChave) return false;
      if (!termo) return true;
      return (
        normalizarTexto(acao.nome).includes(termo) ||
        normalizarTexto(acao.responsavel).includes(termo) ||
        normalizarTexto(acao.igrejaNome).includes(termo) ||
        normalizarTexto(acao.distritoNome).includes(termo)
      );
    });
  }, [todasAcoesEnriquecidas, filtrados, modoPeriodo, dataPassaFiltroPeriodo, filtroAcaoChave, busca]);

  const possuiFiltrosAtivos = Boolean(
    busca ||
      filtroRegiaoId ||
      filtroDistritoId ||
      filtroIgrejaId ||
      filtroAcaoChave ||
      filtroEstrutura ||
      modoPeriodo !== 'todos'
  );

  const limparTodosFiltros = () => {
    setBusca('');
    setFiltroRegiaoId('');
    setFiltroDistritoId('');
    setFiltroIgrejaId('');
    setFiltroAcaoChave('');
    setFiltroEstrutura('');
    setModoPeriodo('todos');
    setSemanaSelecionada('');
    setDataInicioPersonalizada('');
    setDataFimPersonalizada('');
  };

  const selecionarIgrejaFoco = (igrejaId) => {
    const idStr = String(igrejaId);
    setFiltroIgrejaId(idStr);
    setTimeout(() => {
      const el = document.getElementById(`mapa-igreja-${idStr}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Igrejas pendentes de mapeamento no escopo
  const igrejasPendentes = useMemo(() => {
    const idsMapeados = new Set(mapas.map((m) => Number(m.igrejaId || m.igreja?.id)));
    return igrejas
      .filter((ig) => !idsMapeados.has(Number(ig.id)))
      .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
  }, [igrejas, mapas]);

  const resumo = useMemo(() => ({
    igrejas: filtrados.length,
    totalMapeadasGeral: mapas.length,
    membros: filtrados.reduce((acc, mapa) => acc + Number(mapa.igreja?.membros || 0), 0),
    pequenosGrupos: filtrados.reduce((acc, mapa) => acc + Number(mapa.quantidadePequenosGrupos || 0), 0),
    acoes: acoesFiltradasParaResumo.length,
  }), [filtrados, mapas.length, acoesFiltradasParaResumo.length]);

  const resumoAnalitico = useMemo(() => somarMapasIgreja(filtrados), [filtrados]);

  const excluirMapa = async (mapa) => {
    if (!window.confirm(`Excluir o Mapa da Igreja de ${mapa.igreja?.nome || 'esta igreja'}?`)) return;
    setExcluindoId(mapa.id);
    try {
      await api.delete(`/mapa-igreja/${mapa.id}`);
      setMapas((atuais) => atuais.filter((item) => item.id !== mapa.id));
      toast.success('Mapa da Igreja excluído.');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao excluir Mapa da Igreja.');
    } finally {
      setExcluindoId(null);
    }
  };

  const indicadoresOption = useMemo(() => ({
    color: ['#1A3A6B'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 24, right: 16, top: 24, bottom: 58, containLabel: true },
    xAxis: {
      type: 'category',
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontWeight: 700, interval: 0, rotate: 18 },
      data: ['Pequeno Grupo', 'Semana Santa', 'Classe Bíblica', 'Aventureiros', 'Duplas', 'Desbravadores'],
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#e5e7eb' } },
    },
    series: [{
      name: 'Total',
      type: 'bar',
      barWidth: 28,
      itemStyle: {
        borderRadius: [8, 8, 0, 0],
        color: (params) => ['#C9963A', '#0d9488', '#7c3aed', '#0284c7', '#1A3A6B', '#dc2626'][params.dataIndex],
      },
      data: [
        resumoAnalitico.quantidadePequenosGrupos,
        resumoAnalitico.semanaSanta,
        resumoAnalitico.classeBiblica,
        resumoAnalitico.aventureiros,
        resumoAnalitico.quantidadeDuplasMissionarias,
        resumoAnalitico.desbravadores,
      ],
    }],
  }), [resumoAnalitico]);

  const acoesPorIgrejaOption = useMemo(() => {
    const contagemPorIgreja = new Map();
    acoesFiltradasParaResumo.forEach((acao) => {
      const nome = acao.igrejaNome || 'Sem igreja';
      contagemPorIgreja.set(nome, (contagemPorIgreja.get(nome) || 0) + 1);
    });
    const dados = Array.from(contagemPorIgreja.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      color: cores,
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll', textStyle: { color: '#64748b' } },
      series: [{
        name: 'Ações missionárias',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: { color: '#334155', fontWeight: 700 },
        data: dados.length ? dados : [{ name: 'Sem ações', value: 0 }],
      }],
    };
  }, [acoesFiltradasParaResumo]);

  const alternarPainelKpi = (chave) => {
    setPainelKpiAtivo((atual) => (atual === chave ? null : chave));
    setBuscaPainelTopo('');
  };

  if (carregando) return <LoadingState mensagem="Carregando Mapa da Igreja..." />;

  return (
    <div className="animate-fade-in-up">
      {/* Cabeçalho */}
      <div className="rounded-2xl border border-[#1A3A6B]/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Relatório analítico</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1A3A6B] sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
              Mapa da Igreja
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Visão da liderança, estrutura missionária, pequenos grupos, ações e evangelismo de colheita. Clique nos cartões abaixo para explorar rapidamente.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {possuiFiltrosAtivos && (
              <button
                type="button"
                onClick={limparTodosFiltros}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
              >
                Limpar filtros ativos
              </button>
            )}
            <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/cadastro/mapa-igreja`)}>
              Novo cadastro
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cards Principais Interativos (Clicáveis sem precisar abrir select) */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardIndicador
          label="Igrejas mapeadas"
          valor={numero(resumo.igrejas)}
          cor={cores[0]}
          detalhe={`${igrejas.length} igreja(s) no escopo · Clique para listar`}
          ativo={painelKpiAtivo === 'igrejas'}
          subtextoAcao="Ver igrejas ▼"
          onClick={() => alternarPainelKpi('igrejas')}
        />
        <CardIndicador
          label="Membros"
          valor={numero(resumo.membros)}
          cor={cores[1]}
          detalhe="Clique para ver membros por igreja"
          ativo={painelKpiAtivo === 'membros'}
          subtextoAcao="Por igreja ▼"
          onClick={() => alternarPainelKpi('membros')}
        />
        <CardIndicador
          label="Pequenos Grupos"
          valor={numero(resumo.pequenosGrupos)}
          cor={cores[2]}
          detalhe="Clique para ver PGs por igreja"
          ativo={painelKpiAtivo === 'pequenosGrupos'}
          subtextoAcao="Ver PGs ▼"
          onClick={() => alternarPainelKpi('pequenosGrupos')}
        />
        <CardIndicador
          label="Ações Missionárias"
          valor={numero(resumo.acoes)}
          cor={cores[3]}
          detalhe={`${gruposAcoesInteligentes.length} tipo(s) de ação · Clique para explorar`}
          ativo={painelKpiAtivo === 'acoes'}
          subtextoAcao="Ver ações ▼"
          onClick={() => alternarPainelKpi('acoes')}
        />
      </div>

      {/* Painel Explorador Instantâneo ao clicar em qualquer um dos 4 KPI Cards acima */}
      {painelKpiAtivo && (
        <section className="mt-4 rounded-2xl border-2 border-[#1A3A6B]/20 bg-white p-4 shadow-xl sm:p-5 animate-fade-in-up">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#C9963A]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#C9963A]">
                  Acesso Rápido sem Select
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    ['igrejas', `Igrejas Mapeadas (${filtrados.length})`],
                    ['pequenosGrupos', `Pequenos Grupos (${resumo.pequenosGrupos})`],
                    ['acoes', `Ações Missionárias (${resumo.acoes})`],
                    ['membros', `Membros (${numero(resumo.membros)})`],
                  ].map(([chave, rotulo]) => (
                    <button
                      key={chave}
                      type="button"
                      onClick={() => setPainelKpiAtivo(chave)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        painelKpiAtivo === chave
                          ? 'bg-[#1A3A6B] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              </div>
              <h2 className="mt-2 text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                {painelKpiAtivo === 'igrejas' && 'Igrejas Mapeadas — Clique em qualquer igreja para abrir o Mapa'}
                {painelKpiAtivo === 'pequenosGrupos' && 'Pequenos Grupos por Igreja Mapeada'}
                {painelKpiAtivo === 'acoes' && 'Explorador Inteligente de Ações Missionárias'}
                {painelKpiAtivo === 'membros' && 'Distribuição de Membros por Igreja Mapeada'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1 sm:w-64">
                <input
                  type="text"
                  value={buscaPainelTopo}
                  onChange={(e) => setBuscaPainelTopo(e.target.value)}
                  placeholder="Filtrar rapidamente nesta lista..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 pr-7 text-xs text-slate-700 focus:border-[#1A3A6B] focus:bg-white focus:outline-none"
                />
                {buscaPainelTopo && (
                  <button
                    type="button"
                    onClick={() => setBuscaPainelTopo('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPainelKpiAtivo(null)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Fechar painel ✕
              </button>
            </div>
          </div>

          {/* CONTEÚDO 1: IGREJAS MAPEADAS & PENDENTES */}
          {painelKpiAtivo === 'igrejas' && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAbaIgrejasPainel('mapeadas')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      abaIgrejasPainel === 'mapeadas'
                        ? 'bg-[#1A3A6B] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Igrejas Mapeadas ({filtrados.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaIgrejasPainel('pendentes')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      abaIgrejasPainel === 'pendentes'
                        ? 'bg-[#C9963A] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Ainda não mapeadas ({igrejasPendentes.length})
                  </button>
                </div>
                {filtroIgrejaId && (
                  <button
                    type="button"
                    onClick={() => setFiltroIgrejaId('')}
                    className="text-xs font-bold text-[#C9963A] hover:underline"
                  >
                    Mostrar todas as igrejas mapeadas
                  </button>
                )}
              </div>

              {abaIgrejasPainel === 'mapeadas' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtrados
                    .filter((m) => {
                      const t = normalizarTexto(buscaPainelTopo);
                      if (!t) return true;
                      return (
                        normalizarTexto(m.igreja?.nome).includes(t) ||
                        normalizarTexto(m.igreja?.distrito?.nome).includes(t) ||
                        normalizarTexto(m.igreja?.distrito?.regiao?.nome).includes(t) ||
                        normalizarTexto(m.pastorNome).includes(t)
                      );
                    })
                    .map((m) => {
                      const igId = String(m.igrejaId || m.igreja?.id);
                      const selecionada = String(filtroIgrejaId) === igId;
                      const qtdAcoes = Array.isArray(m.acoesMissionarias) ? m.acoesMissionarias.length : 0;
                      return (
                        <div
                          key={m.id}
                          onClick={() => selecionarIgrejaFoco(igId)}
                          className={`group/ig cursor-pointer rounded-xl border p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                            selecionada
                              ? 'border-[#C9963A] bg-[#C9963A]/5 ring-2 ring-[#C9963A]/30'
                              : 'border-slate-200 bg-slate-50/70 hover:border-[#1A3A6B]/40 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#1A3A6B] group-hover/ig:text-[#C9963A]">
                                {m.igreja?.nome}
                              </p>
                              <p className="truncate text-[11px] text-slate-400">
                                {m.igreja?.distrito?.nome || 'Sem distrito'} · {m.igreja?.distrito?.regiao?.nome || 'Sem região'}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-md bg-[#1A3A6B] px-2 py-0.5 text-[10px] font-bold text-white">
                              Abrir →
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                            <span className="rounded-md bg-[#C9963A]/15 px-2 py-0.5 text-[#C9963A]">
                              {numero(m.quantidadePequenosGrupos)} PG(s)
                            </span>
                            <span className="rounded-md bg-orange-100 px-2 py-0.5 text-orange-700">
                              {qtdAcoes} ação(ões)
                            </span>
                            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-teal-700">
                              {numero(m.igreja?.membros)} membros
                            </span>
                          </div>
                          <p className="mt-2 truncate text-[11px] text-slate-500">
                            Pr.: <span className="font-semibold text-slate-700">{m.pastorNome || 'Não informado'}</span>
                          </p>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-96 overflow-y-auto pr-1">
                  {igrejasPendentes
                    .filter((ig) => {
                      const t = normalizarTexto(buscaPainelTopo);
                      if (!t) return true;
                      return (
                        normalizarTexto(ig.nome).includes(t) ||
                        normalizarTexto(ig.distrito?.nome).includes(t) ||
                        normalizarTexto(ig.distrito?.regiao?.nome).includes(t)
                      );
                    })
                    .map((ig) => (
                      <div
                        key={ig.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-white"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-700">{ig.nome}</p>
                          <p className="truncate text-[10px] text-slate-400">
                            {ig.distrito?.nome || 'Sem distrito'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`${prefix}/cadastro/mapa-igreja?igrejaId=${ig.id}`)}
                          className="shrink-0 rounded-lg border border-[#1A3A6B]/20 bg-white px-2.5 py-1 text-[10px] font-bold text-[#1A3A6B] hover:bg-[#1A3A6B] hover:text-white"
                        >
                          Cadastrar
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* CONTEÚDO 2: PEQUENOS GRUPOS POR IGREJA */}
          {painelKpiAtivo === 'pequenosGrupos' && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFiltroEstrutura(filtroEstrutura === 'com_pg' ? '' : 'com_pg')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      filtroEstrutura === 'com_pg'
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Filtrar somente igrejas com Pequenos Grupos (&gt; 0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrdenacaoMapas('pg')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      ordenacaoMapas === 'pg'
                        ? 'bg-[#1A3A6B] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Ordenar página por maior nº de PGs
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...filtrados]
                  .filter((m) => {
                    const t = normalizarTexto(buscaPainelTopo);
                    if (!t) return true;
                    return (
                      normalizarTexto(m.igreja?.nome).includes(t) ||
                      normalizarTexto(m.igreja?.distrito?.nome).includes(t)
                    );
                  })
                  .sort((a, b) => Number(b.quantidadePequenosGrupos || 0) - Number(a.quantidadePequenosGrupos || 0))
                  .map((m) => {
                    const maxPg = Math.max(...filtrados.map((x) => Number(x.quantidadePequenosGrupos || 0)), 1);
                    const qtdPg = Number(m.quantidadePequenosGrupos || 0);
                    const pct = qtdPg > 0 ? Math.max(8, Math.round((qtdPg / maxPg) * 100)) : 0;
                    const igId = String(m.igrejaId || m.igreja?.id);
                    return (
                      <div
                        key={m.id}
                        onClick={() => selecionarIgrejaFoco(igId)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-all hover:-translate-y-0.5 hover:border-[#7c3aed] hover:bg-white hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#1A3A6B]">{m.igreja?.nome}</p>
                            <p className="truncate text-[11px] text-slate-400">
                              {m.igreja?.distrito?.nome} · {m.igreja?.distrito?.regiao?.nome}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-[#7c3aed]/15 px-2.5 py-1 text-sm font-black text-[#7c3aed]">
                            {numero(qtdPg)} PG{qtdPg === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-[#7c3aed]" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                          <span>{numero(m.igreja?._count?.duplas || 0)} dupla(s) · {numero(m.classeBiblica || 0)} classe(s)</span>
                          <span className="font-bold text-[#C9963A]">Ver igreja →</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* CONTEÚDO 3: EXPLORADOR INTELIGENTE DE AÇÕES MISSIONÁRIAS */}
          {painelKpiAtivo === 'acoes' && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Clique em uma Ação Missionária agrupada para filtrar ({gruposAcoesInteligentes.length} tipos cadastrados):
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFiltroAcaoChave('')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    !filtroAcaoChave
                      ? 'bg-[#1A3A6B] text-white shadow-sm'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                  }`}
                >
                  Todas as ações ({acoesFiltradasParaResumo.length})
                </button>
                {gruposAcoesInteligentes
                  .filter((g) => {
                    const t = normalizarTexto(buscaPainelTopo);
                    if (!t) return true;
                    return normalizarTexto(g.rotulo).includes(t);
                  })
                  .map((g) => {
                    const ativo = filtroAcaoChave === g.chave;
                    return (
                      <button
                        key={g.chave}
                        type="button"
                        onClick={() => setFiltroAcaoChave(ativo ? '' : g.chave)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          ativo
                            ? 'bg-[#ea580c] text-white shadow-sm'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#ea580c] hover:bg-white'
                        }`}
                      >
                        {g.rotulo}{' '}
                        <span className="ml-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                          {g.total} · {g.igrejas.size} igr.
                        </span>
                      </button>
                    );
                  })}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-96 overflow-y-auto pr-1">
                {acoesFiltradasParaResumo
                  .filter((acao) => {
                    const t = normalizarTexto(buscaPainelTopo);
                    if (!t) return true;
                    return (
                      normalizarTexto(acao.nome).includes(t) ||
                      normalizarTexto(acao.responsavel).includes(t) ||
                      normalizarTexto(acao.igrejaNome).includes(t) ||
                      normalizarTexto(acao.distritoNome).includes(t)
                    );
                  })
                  .map((acao) => (
                    <div
                      key={acao.idUnico}
                      onClick={() => acao.igrejaId && selecionarIgrejaFoco(acao.igrejaId)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-all hover:-translate-y-0.5 hover:border-[#ea580c] hover:bg-white hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-xs text-[#1A3A6B]">{acao.nome}</p>
                        <span className="shrink-0 rounded-full bg-[#C9963A]/15 px-2 py-0.5 text-[10px] font-bold text-[#C9963A]">
                          {formatarData(acao.data)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Resp.: <span className="font-semibold text-slate-700">{acao.responsavel || 'Não informado'}</span>
                      </p>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 pt-1.5">
                        <span className="truncate text-[10px] font-bold text-[#1A3A6B]">
                          {acao.igrejaNome} · {acao.distritoNome}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-[#C9963A]">Abrir →</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* CONTEÚDO 4: MEMBROS POR IGREJA */}
          {painelKpiAtivo === 'membros' && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...filtrados]
                .filter((m) => {
                  const t = normalizarTexto(buscaPainelTopo);
                  if (!t) return true;
                  return (
                    normalizarTexto(m.igreja?.nome).includes(t) ||
                    normalizarTexto(m.igreja?.distrito?.nome).includes(t)
                  );
                })
                .sort((a, b) => Number(b.igreja?.membros || 0) - Number(a.igreja?.membros || 0))
                .map((m) => {
                  const maxMembros = Math.max(...filtrados.map((x) => Number(x.igreja?.membros || 0)), 1);
                  const qtdMembros = Number(m.igreja?.membros || 0);
                  const pct = qtdMembros > 0 ? Math.max(8, Math.round((qtdMembros / maxMembros) * 100)) : 0;
                  const igId = String(m.igrejaId || m.igreja?.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => selecionarIgrejaFoco(igId)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-all hover:-translate-y-0.5 hover:border-[#0d9488] hover:bg-white hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#1A3A6B]">{m.igreja?.nome}</p>
                          <p className="truncate text-[11px] text-slate-400">
                            {m.igreja?.distrito?.nome} · {m.igreja?.distrito?.regiao?.nome}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-black text-teal-700">
                          {numero(qtdMembros)}
                        </span>
                      </div>
                      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-[#0d9488]" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-2 text-[10px] font-bold text-[#C9963A]">Abrir Mapa desta igreja →</p>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      )}

      {/* ── PAINEL DE BUSCA INTELIGENTE E FILTROS (Período + Igreja + Ações + Pequenos Grupos) ── */}
      <section className="mt-5 rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9963A]">
              Busca Inteligente & Recorte de Período
            </p>
            <h2 className="mt-0.5 text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Localizar Igreja Mapeada, Pequenos Grupos e Ações Missionárias
            </h2>
          </div>

          {/* Botões de modo de período: Todos | Ano | Mês | Semana | Personalizado */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {[
              ['todos', 'Todo o período'],
              ['ano', 'Ano'],
              ['mes', 'Mês'],
              ['semana', 'Semana'],
              ['personalizado', 'Personalizado'],
            ].map(([modo, rotulo]) => (
              <button
                key={modo}
                type="button"
                onClick={() => setModoPeriodo(modo)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  modoPeriodo === modo
                    ? 'bg-[#1A3A6B] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white/70 hover:text-[#1A3A6B]'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>

        {/* Controles específicos quando Ano, Mês, Semana ou Personalizado está ativo */}
        {modoPeriodo !== 'todos' && (
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
            {modoPeriodo === 'ano' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ano das ações / colheita:</span>
                {anosDisponiveis.map((ano) => (
                  <button
                    key={ano}
                    type="button"
                    onClick={() => setAnoSelecionado(ano)}
                    className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                      String(anoSelecionado) === String(ano)
                        ? 'bg-[#1A3A6B] text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-[#1A3A6B]'
                    }`}
                  >
                    {ano}
                  </button>
                ))}
              </div>
            )}

            {modoPeriodo === 'mes' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ano:</span>
                    <select
                      value={anoSelecionado}
                      onChange={(e) => setAnoSelecionado(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1A3A6B]"
                    >
                      {anosDisponiveis.map((ano) => (
                        <option key={ano} value={ano}>{ano}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-xs text-slate-400">Selecione o mês abaixo:</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12">
                  {MESES_NOMES.map((nomeMes, idx) => {
                    const numMes = String(idx + 1);
                    const totalMes = contagemPorMesNoAno[numMes] || 0;
                    const ativo = String(mesSelecionado) === numMes;
                    return (
                      <button
                        key={numMes}
                        type="button"
                        onClick={() => setMesSelecionado(numMes)}
                        className={`flex flex-col items-center rounded-xl border p-2 text-center transition-all ${
                          ativo
                            ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-md'
                            : totalMes > 0
                            ? 'border-[#C9963A]/40 bg-white text-slate-700 hover:border-[#C9963A]'
                            : 'border-slate-200 bg-white/60 text-slate-400 hover:bg-white'
                        }`}
                      >
                        <span className="text-[11px] font-bold">{nomeMes.slice(0, 3)}</span>
                        <span className={`mt-0.5 text-[10px] font-semibold ${ativo ? 'text-amber-300' : totalMes > 0 ? 'text-[#C9963A]' : 'text-slate-400'}`}>
                          {totalMes} aç.
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {modoPeriodo === 'semana' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ano:</span>
                    <select
                      value={anoSelecionado}
                      onChange={(e) => {
                        setAnoSelecionado(e.target.value);
                        setSemanaSelecionada('');
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1A3A6B]"
                    >
                      {anosDisponiveis.map((ano) => (
                        <option key={ano} value={ano}>{ano}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Semana com ações:</span>
                    <select
                      value={semanaSelecionada}
                      onChange={(e) => setSemanaSelecionada(e.target.value)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      <option value="">Todas as semanas de {anoSelecionado}</option>
                      {semanasComAcoes.map((s) => (
                        <option key={s.chave} value={s.chave}>
                          Semana {s.rotulo} ({s.total} ação{s.total === 1 ? '' : 'ões'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {semanasComAcoes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {semanasComAcoes.map((s) => {
                      const ativo = semanaSelecionada === s.chave;
                      return (
                        <button
                          key={s.chave}
                          type="button"
                          onClick={() => setSemanaSelecionada(ativo ? '' : s.chave)}
                          className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-all ${
                            ativo
                              ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-[#C9963A]'
                          }`}
                        >
                          {s.rotulo} <span className="text-[#C9963A]">({s.total})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {modoPeriodo === 'personalizado' && (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Data inicial
                  </label>
                  <input
                    type="date"
                    value={dataInicioPersonalizada}
                    onChange={(e) => setDataInicioPersonalizada(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Data final
                  </label>
                  <input
                    type="date"
                    value={dataFimPersonalizada}
                    onChange={(e) => setDataFimPersonalizada(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                  />
                </div>
                {(dataInicioPersonalizada || dataFimPersonalizada) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDataInicioPersonalizada('');
                      setDataFimPersonalizada('');
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Limpar datas
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Grade de Buscas Inteligentes (Selects pesquisáveis) */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FiltroBuscaInteligente
            label="1. Igreja Mapeada"
            placeholder={`Todas as mapeadas (${opcoesIgrejasMapeadas.length})`}
            value={filtroIgrejaId}
            onChange={setFiltroIgrejaId}
            options={opcoesIgrejasMapeadas}
            emptyText="Nenhuma igreja mapeada encontrada"
          />
          <FiltroBuscaInteligente
            label="2. Ação Missionária"
            placeholder={`Todas as ações (${opcoesAcoesSelect.length} tipos)`}
            value={filtroAcaoChave}
            onChange={setFiltroAcaoChave}
            options={opcoesAcoesSelect}
            emptyText="Nenhuma ação missionária encontrada"
          />
          <FiltroBuscaInteligente
            label="3. Pequenos Grupos / Estrutura"
            placeholder="Toda a estrutura missionária"
            value={filtroEstrutura}
            onChange={setFiltroEstrutura}
            options={opcoesEstruturaSelect}
          />
          <FiltroBuscaInteligente
            label="4. Região"
            placeholder={`Todas as regiões (${opcoesRegioes.length})`}
            value={filtroRegiaoId}
            onChange={(val) => {
              setFiltroRegiaoId(val);
              setFiltroDistritoId('');
              setFiltroIgrejaId('');
            }}
            options={opcoesRegioes}
          />
          <FiltroBuscaInteligente
            label="5. Distrito"
            placeholder={`Todos os distritos (${opcoesDistritos.length})`}
            value={filtroDistritoId}
            onChange={(val) => {
              setFiltroDistritoId(val);
              setFiltroIgrejaId('');
            }}
            options={opcoesDistritos}
          />
        </div>

        {/* Barra de Pesquisa Livre + Ordenação */}
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <input
              className="input-field pr-8 text-sm"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Pesquisa rápida: digite o nome da igreja (ex.: Tijuco Preto), distrito, pastor, ancião, diretor ou ação missionária..."
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              Ordenar igrejas:
            </label>
            <select
              value={ordenacaoMapas}
              onChange={(e) => setOrdenacaoMapas(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#1A3A6B] focus:border-[#1A3A6B] focus:outline-none"
            >
              <option value="nome">Ordem alfabética (A-Z)</option>
              <option value="pg">Maior nº de Pequenos Grupos</option>
              <option value="acoes">Maior nº de Ações Missionárias</option>
              <option value="membros">Maior nº de Membros</option>
              <option value="recentes">Atualizados recentemente</option>
            </select>
          </div>
        </div>

        {/* Acesso Rápido em 1 clique para as Igrejas Mapeadas (ex.: Tijuco Preto) */}
        {mapas.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Ir direto para a igreja:
              </span>
              <button
                type="button"
                onClick={() => setFiltroIgrejaId('')}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition-all ${
                  !filtroIgrejaId
                    ? 'bg-[#1A3A6B] text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                }`}
              >
                Todas ({mapas.length})
              </button>
              {opcoesIgrejasMapeadas.map((ig) => {
                const ativa = String(filtroIgrejaId) === String(ig.value);
                return (
                  <button
                    key={ig.value}
                    type="button"
                    onClick={() => setFiltroIgrejaId(ativa ? '' : String(ig.value))}
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                      ativa
                        ? 'bg-[#C9963A] text-white shadow-sm font-bold'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-[#C9963A] hover:text-[#1A3A6B]'
                    }`}
                  >
                    {ig.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Quando uma única igreja está selecionada (ex.: Tijuco Preto), mostramos o Mapa dela logo aqui em cima em destaque! */}
      {filtroIgrejaId && filtrados.length === 1 && (
        <div className="mt-5 space-y-5">
          <MapaCard
            mapa={filtrados[0]}
            destacada
            onLimparDestaque={() => setFiltroIgrejaId('')}
            excluindo={excluindoId === filtrados[0].id}
            onExcluir={excluirMapa}
            onEditar={() => navigate(`${prefix}/cadastro/mapa-igreja?igrejaId=${filtrados[0].igrejaId}`)}
          />
        </div>
      )}

      {/* Resumo Consolidado (Mapa da Igreja - Geral ou Recorte Filtrado) */}
      <div className="mt-5">
        <MapaIgrejaResumo
          mapas={filtrados}
          acoesFiltradasExternas={acoesFiltradasParaResumo}
          onSelecionarIgreja={selecionarIgrejaFoco}
          indicadorAtivoExterno={indicadorResumoAtivo}
          onSelecionarIndicador={setIndicadorResumoAtivo}
          titulo={possuiFiltrosAtivos ? 'Mapa da Igreja — Consolidado Filtrado' : 'Mapa da Igreja - Geral'}
          subtitulo={
            possuiFiltrosAtivos
              ? `Exibindo consolidado de ${filtrados.length} igreja(s) mapeada(s) e ${acoesFiltradasParaResumo.length} ação(ões) para os filtros aplicados.`
              : 'Consolidado de todas as igrejas mapeadas no escopo administrativo. Clique em qualquer estrutura ou ação para detalhar por igreja.'
          }
        />
      </div>

      {/* Gráficos Analíticos */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="group rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:border-[#C9963A]/60 hover:shadow-xl sm:p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Gráficos</p>
          <h2 className="mt-1 text-xl font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>
            Estrutura missionária
          </h2>
          <EChart option={indicadoresOption} className="h-80" />
        </section>

        <section className="group rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:border-[#C9963A]/60 hover:shadow-xl sm:p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Gráficos</p>
          <h2 className="mt-1 text-xl font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>
            Ações missionárias por igreja
          </h2>
          <EChart option={acoesPorIgrejaOption} className="h-80" />
        </section>
      </div>

      {/* Lista de Mapas Individuais das Igrejas (quando não está no modo de foco único já exibido acima) */}
      {!(filtroIgrejaId && filtrados.length === 1) && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Detalhamento Individual</p>
              <h2 className="text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                Mapas Cadastrados por Igreja ({filtrados.length})
              </h2>
            </div>
            {possuiFiltrosAtivos && (
              <button
                type="button"
                onClick={limparTodosFiltros}
                className="self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Ver todas as {mapas.length} igrejas mapeadas
              </button>
            )}
          </div>

          {filtrados.map((mapa) => (
            <MapaCard
              key={mapa.id}
              mapa={mapa}
              excluindo={excluindoId === mapa.id}
              onExcluir={excluirMapa}
              onEditar={() => navigate(`${prefix}/cadastro/mapa-igreja?igrejaId=${mapa.igrejaId}`)}
            />
          ))}
          {filtrados.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
              <p className="text-base font-semibold text-slate-600">
                Nenhum Mapa da Igreja encontrado para os filtros selecionados.
              </p>
              {possuiFiltrosAtivos && (
                <button
                  type="button"
                  onClick={limparTodosFiltros}
                  className="mt-3 rounded-xl bg-[#1A3A6B] px-4 py-2 text-xs font-bold text-white hover:bg-[#1A3A6B]/90"
                >
                  Limpar todos os filtros
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
