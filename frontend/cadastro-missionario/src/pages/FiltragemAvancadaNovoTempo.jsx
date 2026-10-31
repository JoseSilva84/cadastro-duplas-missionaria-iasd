import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import ModalLeadNovoTempo from '../components/ModalLeadNovoTempo';
import { exportarListaLeadsPdf } from '../lib/pdfNovoTempo';
import { ICONE_IGREJA_NT } from '../lib/iconesMapaNovoTempo';
import { useAuth } from '../contexts/AuthContext';
import { chaveCacheUsuario, lerCacheLocal, salvarCacheLocal } from '../lib/cacheLocal';

const numero = (valor) => new Intl.NumberFormat('pt-BR').format(Number(valor) || 0);
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const PRIORIDADES = { Hot: ['Quente', '#dc2626'], Warm: ['Potencial', '#f97316'], Cool: ['Morno', '#2563eb'], Cold: ['Frio', '#334155'] };

const filtrosIniciais = {
  busca: '', distritos: [], bairros: [], materiais: [], idades: [], generos: [], prioridades: [],
  whatsapp: 'todos', email: 'todos', estudos: 'todos', vip: 'todos', religiao: 'todos', tempo: 'todos',
};

function coordenadasValidas(item) {
  if (item?.latitude === null || item?.latitude === undefined || item?.latitude === ''
    || item?.longitude === null || item?.longitude === undefined || item?.longitude === '') return false;
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function ehAproximada(item) {
  return /aproxim|fallback/i.test(`${item.geoPrecisao || ''} ${item.geoOrigem || ''}`);
}

function enderecoDoLead(lead) {
  return lead.endereco || [lead.bairro, lead.cidade, lead.distrito].filter(Boolean).join(' - ');
}

function linksDoMapa(lead) {
  const endereco = enderecoDoLead(lead);
  const consulta = endereco || (coordenadasValidas(lead) ? `${lead.latitude},${lead.longitude}` : lead.distrito);
  return {
    osm: coordenadasValidas(lead)
      ? `https://www.openstreetmap.org/?mlat=${lead.latitude}&mlon=${lead.longitude}#map=16/${lead.latitude}/${lead.longitude}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(consulta)}`,
    google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`,
  };
}

function Alternador({ ativo, children, onClick, quantidade }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-md ${ativo ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 bg-white text-slate-600'}`}>
      {children} <span className={`ml-1 rounded-full px-2 py-0.5 text-xs ${ativo ? 'bg-white/20' : 'bg-slate-100'}`}>{numero(quantidade)}</span>
    </button>
  );
}

function PainelOpcoes({ titulo, opcoes, selecionados, onChange, pesquisavel = false }) {
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(() => {
    const termo = normalizar(busca);
    return opcoes.filter((item) => !termo || normalizar(item.nome).includes(termo)).slice(0, 80);
  }, [busca, opcoes]);
  const alternar = (nome) => onChange(selecionados.includes(nome) ? selecionados.filter((x) => x !== nome) : [...selecionados, nome]);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-600">{titulo}</h3>
        {!!selecionados.length && <button type="button" onClick={() => onChange([])} className="text-xs font-semibold text-blue-600 hover:underline">Limpar</button>}
      </div>
      {pesquisavel && (
        <label className="relative mb-3 block">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} className="input-field w-full text-sm" style={{ paddingLeft: '3rem' }} placeholder={`Buscar ${titulo.toLowerCase()}...`} />
        </label>
      )}
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
        {visiveis.map((item) => <Alternador key={item.nome} ativo={selecionados.includes(item.nome)} quantidade={item.total} onClick={() => alternar(item.nome)}>{item.nome}</Alternador>)}
      </div>
    </section>
  );
}

function SelectFiltro({ titulo, valor, onChange, opcoes, total }) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-600">{titulo}</span>
      <select className="input-field w-full" value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="todos">Todos ({numero(total)})</option>
        {opcoes.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo} ({numero(opcao.quantidade)})</option>)}
      </select>
    </label>
  );
}

function AjustarMapa({ pontos }) {
  const map = useMap();
  useEffect(() => {
    if (!pontos.length) return;
    map.fitBounds(pontos.map((ponto) => [Number(ponto.latitude), Number(ponto.longitude)]), { padding: [28, 28], maxZoom: 13 });
  }, [map, pontos]);
  return null;
}

function Mapa({ leads, igrejas, onSelecionarLead }) {
  const [categoriasAtivas, setCategoriasAtivas] = useState([]);
  const temSelecao = categoriasAtivas.length > 0;
  const leadsVisiveis = useMemo(() => {
    if (!temSelecao) return leads;
    return leads.filter((lead) => categoriasAtivas.includes(lead.prioridade));
  }, [categoriasAtivas, leads, temSelecao]);
  const igrejasVisiveis = useMemo(() => (
    !temSelecao || categoriasAtivas.includes('igrejas') ? igrejas : []
  ), [categoriasAtivas, igrejas, temSelecao]);
  const pontosLeads = useMemo(() => leadsVisiveis.filter(coordenadasValidas).slice(0, 300), [leadsVisiveis]);
  const pontosIgrejas = useMemo(() => igrejasVisiveis.filter(coordenadasValidas), [igrejasVisiveis]);
  const pontos = useMemo(() => [...pontosLeads, ...pontosIgrejas], [pontosIgrejas, pontosLeads]);
  const centro = pontos[0] ? [Number(pontos[0].latitude), Number(pontos[0].longitude)] : [-23.5505, -46.6333];
  const exatos = leadsVisiveis.filter((item) => coordenadasValidas(item) && !ehAproximada(item)).length;
  const aproximados = leadsVisiveis.filter((item) => coordenadasValidas(item) && ehAproximada(item)).length;
  const contagensPrioridade = useMemo(() => leads.reduce((totais, lead) => {
    totais[lead.prioridade] = (totais[lead.prioridade] || 0) + 1;
    return totais;
  }, {}), [leads]);
  const alternarCategoria = (categoria) => setCategoriasAtivas((atuais) => (
    atuais.includes(categoria) ? atuais.filter((item) => item !== categoria) : [...atuais, categoria]
  ));
  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-lg">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-white to-emerald-50 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Mapa dos leads filtrados</p>
          <h2 className="mt-1 text-2xl font-bold text-[#1A3A6B]">Pontos com leads e igrejas</h2>
          <p className="mt-1 text-sm text-slate-500">{numero(exatos)} coordenadas exatas · {numero(aproximados)} aproximadas · {numero(leadsVisiveis.length - exatos - aproximados)} sem coordenadas · exibindo até 300 leads</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Filtrar pontos do mapa">
          {Object.entries(PRIORIDADES).map(([chave, [rotulo, cor]]) => {
            const ativo = !temSelecao || categoriasAtivas.includes(chave);
            return <button type="button" key={chave} aria-pressed={categoriasAtivas.includes(chave)} onClick={() => alternarCategoria(chave)} className={`rounded-full border px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${ativo ? 'border-slate-200 bg-white text-slate-900' : 'border-transparent bg-white/50 text-slate-400 opacity-60'}`}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: cor }} />{rotulo} {numero(contagensPrioridade[chave])}</button>;
          })}
          <button type="button" aria-pressed={categoriasAtivas.includes('igrejas')} onClick={() => alternarCategoria('igrejas')} className={`rounded-full border px-3 py-2 text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${!temSelecao || categoriasAtivas.includes('igrejas') ? 'border-emerald-100 bg-white' : 'border-transparent bg-white/50 opacity-60'}`}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />Igrejas {numero(igrejas.filter(coordenadasValidas).length)}</button>
          {temSelecao && <button type="button" onClick={() => setCategoriasAtivas([])} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">Mostrar todos</button>}
        </div>
      </div>
      <div className="relative z-0 h-[520px] w-full">
        <MapContainer center={centro} zoom={9} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AjustarMapa pontos={pontos} />
          {pontosLeads.map((lead, indice) => {
            const cor = PRIORIDADES[lead.prioridade]?.[1] || '#334155';
            const aproximada = ehAproximada(lead);
            const endereco = enderecoDoLead(lead);
            const links = linksDoMapa(lead);
            return (
              <CircleMarker key={`lead-${lead.id || indice}`} center={[Number(lead.latitude), Number(lead.longitude)]} radius={aproximada ? 6 : 7} pathOptions={{ color: '#fff', weight: 2, fillColor: cor, fillOpacity: aproximada ? 0.55 : 0.9, dashArray: aproximada ? '4 3' : undefined }}>
                <Popup minWidth={285} maxWidth={340}>
                  <div className="space-y-1 text-sm leading-snug text-slate-700">
                    <strong className="block pr-5 text-base text-slate-900">{lead.nome}</strong>
                    <strong className="block" style={{ color: cor }}>{PRIORIDADES[lead.prioridade]?.[0] || 'Sem prioridade'}</strong>
                    <span className="block">{lead.distrito || 'Distrito não informado'}</span>
                    <span className="block">{lead.bairro || 'Bairro não informado'}</span>
                    <span className="block">{endereco || 'Endereço não informado'}</span>
                    <span className="block">{lead.whatsapp || 'Telefone não informado'}</span>
                    <span className="block text-xs font-semibold text-slate-600">Ponto {aproximada ? 'aproximado' : 'exato'}</span>
                    {aproximada && <strong className="block text-xs text-amber-700">Coordenada aproximada. Confira a precisão no Google Maps.</strong>}
                    <a href={links.osm} target="_blank" rel="noreferrer" className="block font-medium text-sky-600 hover:underline">Abrir endereço no OSM</a>
                    <a href={links.google} target="_blank" rel="noreferrer" className="block font-medium text-sky-600 hover:underline">Abrir endereço no Google Maps</a>
                    <button type="button" className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white shadow transition hover:bg-blue-700" onClick={() => onSelecionarLead(lead)}>Detalhes do Lead</button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          {pontosIgrejas.map((igreja, indice) => {
            const aproximada = ehAproximada(igreja);
            const links = linksDoMapa(igreja);
            return (
              <Marker key={`igreja-${igreja.nome}-${indice}`} position={[Number(igreja.latitude), Number(igreja.longitude)]} icon={ICONE_IGREJA_NT} zIndexOffset={1000}>
                <Popup minWidth={285} maxWidth={340}>
                  <div className="space-y-1 text-sm leading-snug text-slate-700">
                    <strong className="block pr-5 text-base text-slate-900">{igreja.nome}</strong>
                    <strong className="block text-emerald-600">Igreja Adventista</strong>
                    <span className="block">{igreja.distrito || 'Distrito não informado'}</span>
                    <span className="block">{igreja.endereco || igreja.geoNomeExibicao || 'Endereço não informado'}</span>
                    <span className="block text-xs font-semibold text-slate-600">Endereço {aproximada ? 'aproximado' : 'exato'}</span>
                    {aproximada && <strong className="block text-xs text-amber-700">Coordenada aproximada. Confira a precisão no Google Maps.</strong>}
                    <a href={links.osm} target="_blank" rel="noreferrer" className="block font-medium text-sky-600 hover:underline">Abrir igreja no OSM</a>
                    <a href={links.google} target="_blank" rel="noreferrer" className="block font-medium text-sky-600 hover:underline">Abrir igreja no Google Maps</a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <div className="flex flex-col gap-2 border-t border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
        <p>Clique nas cores para ligar ou desligar categorias. Sem seleção, o mapa mostra quentes, potenciais, mornos, frios e igrejas.</p>
        <a className="btn-outline whitespace-nowrap" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/#map=11/${centro[0]}/${centro[1]}`}>Abrir no OSM</a>
      </div>
    </section>
  );
}

function CardResumo({ titulo, valor, detalhe, classe }) {
  return <div className={`rounded-2xl p-5 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${classe}`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/85">{titulo}</p><p className="mt-5 text-3xl font-bold">{numero(valor)}</p><p className="mt-1 text-sm text-white/80">{detalhe}</p></div>;
}

export default function FiltragemAvancadaNovoTempo() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = location.pathname.startsWith('/direto') ? '/direto' : '';
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [facetas, setFacetas] = useState(null);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState(null);
  const requisicaoAtual = useRef(0);
  const sentinelaRef = useRef(null);
  const facetasSolicitadasRef = useRef(false);
  const versaoRef = useRef(null);

  const parametrosDosFiltros = useCallback((pagina, incluirFacetas = false) => {
    const params = { pagina, limite: 100, ...(incluirFacetas ? { incluirFacetas: 1 } : {}) };
    Object.entries(filtros).forEach(([campo, valor]) => {
      if (Array.isArray(valor)) {
        if (valor.length) params[campo] = valor.join('|');
      } else if (valor && valor !== 'todos') params[campo] = valor;
    });
    return params;
  }, [filtros]);

  const carregarPagina = useCallback(async (pagina = 1, anexar = false, incluirFacetas = false) => {
    const idRequisicao = ++requisicaoAtual.current;
    const params = parametrosDosFiltros(pagina, incluirFacetas);
    if (anexar && versaoRef.current) params.versao = versaoRef.current;
    const caminho = '/interessados-nt/filtragem-avancada';
    const chaveCache = chaveCacheUsuario(usuario, `tela-filtragem-nt:${caminho}:${JSON.stringify(params)}`);
    if (anexar) setCarregandoMais(true);
    else setAtualizando(true);
    setErro('');
    if (!anexar) {
      const cache = await lerCacheLocal(chaveCache);
      if (cache?.dados && idRequisicao === requisicaoAtual.current) {
        versaoRef.current = cache.dados.versao || null;
        setDados(cache.dados);
        if (cache.dados.facetas) setFacetas(cache.dados.facetas);
      }
    }
    try {
      const { data } = await api.get(caminho, { params });
      if (idRequisicao !== requisicaoAtual.current) return;
      versaoRef.current = data.versao || null;
      if (data.facetas) setFacetas(data.facetas);
      setDados((atual) => anexar
        ? { ...data, facetas: data.facetas || atual?.facetas, leads: [...(atual?.leads || []), ...(data.leads || [])] }
        : { ...data, facetas: data.facetas || atual?.facetas });
      await salvarCacheLocal(chaveCache, data, usuario);
    } catch (falha) {
      if (idRequisicao === requisicaoAtual.current) {
        if (falha.response?.data?.codigo === 'VERSAO_NT_EXPIRADA') {
          versaoRef.current = null;
          setFiltros((atuais) => ({ ...atuais }));
        }
        else setErro(falha.response?.data?.erro || 'Não foi possível carregar a filtragem avançada.');
      }
    } finally {
      if (idRequisicao === requisicaoAtual.current) {
        setCarregandoMais(false);
        setAtualizando(false);
      }
    }
  }, [parametrosDosFiltros, usuario]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => carregarPagina(1, false, false), filtros.busca ? 350 : 80);
    return () => window.clearTimeout(temporizador);
  }, [carregarPagina, filtros.busca]);

  useEffect(() => {
    if (facetasSolicitadasRef.current) return undefined;
    facetasSolicitadasRef.current = true;
    let ativo = true;
    const params = { pagina: 1, limite: 1, incluirFacetas: 1 };
    const caminho = '/interessados-nt/filtragem-avancada';
    const chaveCache = chaveCacheUsuario(usuario, `tela-filtragem-nt-facetas:${caminho}`);
    (async () => {
      const cache = await lerCacheLocal(chaveCache);
      if (ativo && cache?.dados?.facetas) setFacetas(cache.dados.facetas);
      try {
        const { data } = await api.get(caminho, { params });
        if (ativo && data.facetas) setFacetas(data.facetas);
        await salvarCacheLocal(chaveCache, data, usuario);
      } catch {
        // A página e os filtros básicos continuam utilizáveis com a cópia local.
      }
    })();
    return () => { ativo = false; };
  }, [usuario]);

  const sincronizando = dados?.sincronizando;
  const semDados = dados?.semDados;
  const atualizadoEm = dados?.atualizadoEm;
  useEffect(() => {
    if (!sincronizando && !semDados) return undefined;
    let consultando = false;
    const temporizador = window.setInterval(async () => {
      if (consultando) return;
      consultando = true;
      try {
        const { data: status } = await api.get('/interessados-nt/status');
        if (status.atualizadoEm && status.atualizadoEm !== atualizadoEm) {
          await carregarPagina(1, false, false);
        } else {
          setDados((atual) => {
            if (!atual) return atual;
            if (atual.sincronizando === status.sincronizando && atual.semDados === status.semDados
              && atual.erroSincronizacao === status.erroSincronizacao) return atual;
            return { ...atual, sincronizando: status.sincronizando, semDados: status.semDados, erroSincronizacao: status.erroSincronizacao };
          });
        }
      } catch {
        // A cópia local continua disponível durante uma falha temporária.
      } finally {
        consultando = false;
      }
    }, 10000);
    return () => window.clearInterval(temporizador);
  }, [atualizadoEm, carregarPagina, sincronizando, semDados]);

  const leads = useMemo(() => dados?.leads || [], [dados?.leads]);
  const opcoes = useMemo(() => ({
    distritos: facetas?.distritos || [],
    bairros: facetas?.bairros || [],
    materiais: facetas?.materiais || [],
    idades: facetas?.idades || [],
    generos: facetas?.generos || [],
    prioridades: facetas?.prioridades || [],
  }), [facetas]);

  const facetasSelect = useMemo(() => {
    const totalResultado = Number(dados?.total || 0);
    const resumo = dados?.resumo || {};
    const tempos = {
      'Até 3 meses': resumo.tempoAte3Meses || 0,
      '3 meses a 1 ano': resumo.tempo3Meses1Ano || 0,
      '1 a 2 anos': resumo.tempo1A2Anos || 0,
      '2 a 5 anos': resumo.tempo2A5Anos || 0,
      '5+ anos': resumo.tempo5AnosMais || 0,
      'Não informado': resumo.tempoNaoInformado || 0,
    };
    return {
      whatsapp: { total: totalResultado, opcoes: [{ valor: 'sim', rotulo: 'Com WhatsApp', quantidade: resumo.comWhatsapp || 0 }, { valor: 'nao', rotulo: 'Sem WhatsApp', quantidade: Math.max(0, totalResultado - (resumo.comWhatsapp || 0)) }] },
      email: { total: totalResultado, opcoes: [{ valor: 'sim', rotulo: 'Com e-mail', quantidade: resumo.comEmail || 0 }, { valor: 'nao', rotulo: 'Sem e-mail', quantidade: Math.max(0, totalResultado - (resumo.comEmail || 0)) }] },
      estudos: { total: totalResultado, opcoes: [{ valor: 'sim', rotulo: 'Ativo', quantidade: resumo.estudos || 0 }, { valor: 'nao', rotulo: 'Sem estudo ativo', quantidade: Math.max(0, totalResultado - (resumo.estudos || 0)) }] },
      vip: { total: totalResultado, opcoes: [{ valor: 'sim', rotulo: 'VIP', quantidade: resumo.vips || 0 }, { valor: 'nao', rotulo: 'Não VIP', quantidade: Math.max(0, totalResultado - (resumo.vips || 0)) }] },
      religiao: { total: totalResultado, opcoes: [{ valor: 'adventista', rotulo: 'Adventista', quantidade: resumo.adventistas || 0 }, { valor: 'outra', rotulo: 'Outras', quantidade: Math.max(0, totalResultado - (resumo.adventistas || 0)) }] },
      tempo: { total: totalResultado, opcoes: Object.entries(tempos).map(([faixa, quantidade]) => ({ valor: faixa, rotulo: faixa, quantidade })) },
    };
  }, [dados?.resumo, dados?.total]);

  const filtrados = leads;

  const igrejasFiltradas = useMemo(() => (dados?.igrejas || []).filter((igreja) => !filtros.distritos.length || filtros.distritos.some((nome) => normalizar(nome) === normalizar(igreja.distrito))), [dados?.igrejas, filtros.distritos]);
  const alterar = (campo, valor) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor, ...(campo === 'distritos' ? { bairros: [] } : {}) }));
  };
  const totalWhats = dados?.resumo?.comWhatsapp || 0;
  const totalQuentes = dados?.resumo?.quentes || 0;
  const reativar = dados?.resumo?.reativar || 0;

  const carregarMais = useCallback(() => {
    if (!dados?.temMais || carregandoMais) return;
    carregarPagina(Number(dados.pagina || 1) + 1, true, false);
  }, [carregarPagina, carregandoMais, dados]);

  useEffect(() => {
    const alvo = sentinelaRef.current;
    if (!alvo || !dados?.temMais) return undefined;
    const observador = new IntersectionObserver((entradas) => {
      if (entradas.some((entrada) => entrada.isIntersecting)) carregarMais();
    }, { rootMargin: '240px' });
    observador.observe(alvo);
    return () => observador.disconnect();
  }, [carregarMais, dados?.temMais]);

  const exportar = () => exportarListaLeadsPdf(filtrados);

  if (!dados && !erro) return <LoadingState mensagem="Carregando a filtragem avançada..." />;
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 animate-fade-in sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <button type="button" className="btn-outline mb-5" onClick={() => navigate(`${prefix}/interessados-nt`)}>← Voltar aos interessados</button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">CRM de leads</p><h1 className="mt-2 text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Filtragem Avançada</h1><p className="mt-2 text-slate-500">Encontre os contatos certos e visualize leads e igrejas no mapa.</p></div><div className="rounded-2xl bg-emerald-50 px-6 py-4 text-right"><p className="text-xs uppercase tracking-wider text-emerald-700">Resultado</p><p className="text-3xl font-bold text-emerald-950">{numero(dados?.total)}</p>{atualizando && <p className="mt-1 text-xs text-emerald-700">Atualizando...</p>}</div></div>
      </header>
      {erro && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{erro}</div>}
      {dados?.erroSincronizacao && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{dados.erroSincronizacao}</div>}
      {dados?.semDados && <div className="rounded-2xl border border-blue-100 bg-white p-6 text-sm text-slate-600">Aguardando a primeira sincronização dos interessados NT.</div>}
      {dados && !dados.semDados && <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><CardResumo titulo="Total de leads" valor={dados.total} detalhe="resultado completo dos filtros" classe="bg-gradient-to-br from-blue-600 to-cyan-600"/><CardResumo titulo="Com WhatsApp" valor={totalWhats} detalhe="aptos para contato" classe="bg-gradient-to-br from-emerald-500 to-teal-700"/><CardResumo titulo="Quentes" valor={totalQuentes} detalhe="prioridade para ação" classe="bg-gradient-to-br from-red-600 to-orange-500"/><CardResumo titulo="Reativar" valor={reativar} detalhe="sem contato há mais de 1 ano" classe="bg-gradient-to-br from-violet-600 to-fuchsia-600"/></div>
        <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-lg sm:p-7">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Filtragem avançada</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Encontrar leads certos</h2></div><button type="button" onClick={() => setFiltros(filtrosIniciais)} className="btn-outline">Limpar todos os filtros</button></div>
          <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(260px,0.7fr)_minmax(0,1.3fr)]">
            <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-600">Associação</span><select className="input-field w-full" value="paulistana" disabled><option value="paulistana">Associação Paulistana</option></select></label>
            <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-600">Buscar</span><span className="relative block"><svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input value={filtros.busca} onChange={(e) => alterar('busca', e.target.value)} className="input-field w-full" style={{ paddingLeft: '3.5rem' }} placeholder="Nome, e-mail, distrito, bairro, material ou WhatsApp" /></span></label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2"><PainelOpcoes titulo="Distritos" pesquisavel opcoes={opcoes.distritos} selecionados={filtros.distritos} onChange={(v) => alterar('distritos', v)}/><PainelOpcoes key={`bairros-${filtros.distritos.join('|')}`} titulo="Bairros" pesquisavel opcoes={opcoes.bairros} selecionados={filtros.bairros} onChange={(v) => alterar('bairros', v)}/><PainelOpcoes titulo="Materiais" pesquisavel opcoes={opcoes.materiais} selecionados={filtros.materiais} onChange={(v) => alterar('materiais', v)}/><div className="grid gap-4 sm:grid-cols-2"><PainelOpcoes titulo="Prioridade" opcoes={opcoes.prioridades} selecionados={filtros.prioridades} onChange={(v) => alterar('prioridades', v)}/><PainelOpcoes titulo="Idade" opcoes={opcoes.idades} selecionados={filtros.idades} onChange={(v) => alterar('idades', v)}/><PainelOpcoes titulo="Gênero" opcoes={opcoes.generos} selecionados={filtros.generos} onChange={(v) => alterar('generos', v)}/></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <SelectFiltro titulo="WhatsApp" valor={filtros.whatsapp} onChange={(v) => alterar('whatsapp', v)} {...facetasSelect.whatsapp}/>
            <SelectFiltro titulo="E-mail" valor={filtros.email} onChange={(v) => alterar('email', v)} {...facetasSelect.email}/>
            <SelectFiltro titulo="Estudos" valor={filtros.estudos} onChange={(v) => alterar('estudos', v)} {...facetasSelect.estudos}/>
            <SelectFiltro titulo="VIP" valor={filtros.vip} onChange={(v) => alterar('vip', v)} {...facetasSelect.vip}/>
            <SelectFiltro titulo="Religião" valor={filtros.religiao} onChange={(v) => alterar('religiao', v)} {...facetasSelect.religiao}/>
            <SelectFiltro titulo="Tempo" valor={filtros.tempo} onChange={(v) => alterar('tempo', v)} {...facetasSelect.tempo}/>
          </div>
        </section>
        <Mapa leads={filtrados} igrejas={igrejasFiltradas} onSelecionarLead={setLeadSelecionado}/>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="text-xl font-bold text-[#1A3A6B]">Lista de leads</h2><p className="text-sm text-slate-500">{numero(dados.total)} encontrados. {numero(filtrados.length)} carregados em lotes de 100. Clique em um lead para ver todos os dados.</p></div>
            <button type="button" onClick={exportar} disabled={!filtrados.length} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Exportar itens carregados</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-left text-xs uppercase tracking-wider text-white"><tr><th className="p-4">Nome</th><th className="p-4">WhatsApp</th><th className="p-4">Distrito</th><th className="p-4">Bairro</th><th className="p-4">Material</th><th className="p-4">Prioridade</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.map((lead, i) => (
                  <tr key={lead.id || i} tabIndex={0} role="button" aria-label={`Abrir detalhes de ${lead.nome}`} onClick={() => setLeadSelecionado(lead)} onKeyDown={(evento) => { if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); setLeadSelecionado(lead); } }} className="cursor-pointer transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
                    <td className="p-4"><strong className="text-slate-900">{lead.nome}</strong><br/><span className="text-xs text-slate-400">{lead.email || 'Sem e-mail'}</span></td>
                    <td className="p-4 text-emerald-700">{lead.whatsapp || 'Não informado'}</td>
                    <td className="p-4">{lead.distrito}</td>
                    <td className="p-4">{lead.bairro || 'Não informado'}</td>
                    <td className="max-w-52 truncate p-4" title={lead.material}>{lead.material || 'Não informado'}</td>
                    <td className="p-4"><span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{background: PRIORIDADES[lead.prioridade]?.[1] || '#64748b'}}>{PRIORIDADES[lead.prioridade]?.[0] || 'Sem prioridade'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dados.temMais && <div ref={sentinelaRef} className="border-t border-slate-100 p-4 text-center"><button type="button" disabled={carregandoMais} className="btn-outline" onClick={carregarMais}>{carregandoMais ? 'Carregando mais 100...' : 'Ver mais 100'}</button></div>}
        </section>
      </>}
      <ModalLeadNovoTempo lead={leadSelecionado} igrejas={dados?.igrejas || []} onFechar={() => setLeadSelecionado(null)} />
    </div>
  );
}
