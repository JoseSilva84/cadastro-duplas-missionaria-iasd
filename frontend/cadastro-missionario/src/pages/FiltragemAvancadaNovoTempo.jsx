import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import ModalLeadNovoTempo from '../components/ModalLeadNovoTempo';
import { exportarListaLeadsPdf } from '../lib/pdfNovoTempo';
import { ICONE_IGREJA_NT } from '../lib/iconesMapaNovoTempo';

const numero = (valor) => new Intl.NumberFormat('pt-BR').format(Number(valor) || 0);
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const PRIORIDADES = { Hot: ['Quente', '#dc2626'], Warm: ['Potencial', '#f97316'], Cool: ['Morno', '#2563eb'], Cold: ['Frio', '#334155'] };
const cacheTextoBusca = new WeakMap();

const filtrosIniciais = {
  busca: '', distritos: [], bairros: [], materiais: [], idades: [], generos: [], prioridades: [],
  whatsapp: 'todos', email: 'todos', estudos: 'todos', vip: 'todos', religiao: 'todos', tempo: 'todos',
};

function idadeDoLead(lead) {
  if (Number.isFinite(Number(lead.idade))) return Number(lead.idade);
  if (!lead.dataNascimento) return null;
  const nascimento = new Date(lead.dataNascimento);
  if (Number.isNaN(nascimento.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  if (hoje < new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate())) idade -= 1;
  return idade;
}

function faixaIdade(lead) {
  const idade = idadeDoLead(lead);
  if (idade === null) return 'Sem idade';
  if (idade <= 17) return 'Até 17';
  if (idade <= 29) return '18 a 29';
  if (idade <= 44) return '30 a 44';
  if (idade <= 59) return '45 a 59';
  return '60+';
}

function faixaTempo(dias) {
  if (dias === null || dias === undefined || dias === '') return 'Não informado';
  const valor = Number(dias);
  if (valor <= 90) return 'Até 3 meses';
  if (valor <= 365) return '3 meses a 1 ano';
  if (valor <= 730) return '1 a 2 anos';
  if (valor <= 1825) return '2 a 5 anos';
  return '5+ anos';
}

function coordenadasValidas(item) {
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

function textoBuscaDoLead(lead) {
  if (cacheTextoBusca.has(lead)) return cacheTextoBusca.get(lead);
  const valor = normalizar([lead.nome, lead.email, lead.whatsapp, lead.distrito, lead.bairro, lead.material, lead.religiao, lead.id].join(' '));
  cacheTextoBusca.set(lead, valor);
  return valor;
}

function aplicarFiltros(leads, filtros, ignorarCampo = '') {
  const textoBusca = normalizar(filtros.busca);
  return leads.filter((lead) => {
    if (textoBusca && !textoBuscaDoLead(lead).includes(textoBusca)) return false;
    if (ignorarCampo !== 'distritos' && filtros.distritos.length && !filtros.distritos.includes(lead.distrito || 'Não informado')) return false;
    if (ignorarCampo !== 'bairros' && filtros.bairros.length && !filtros.bairros.includes(lead.bairro || 'Não informado')) return false;
    if (ignorarCampo !== 'materiais' && filtros.materiais.length && !filtros.materiais.includes(lead.material || 'Não informado')) return false;
    if (ignorarCampo !== 'idades' && filtros.idades.length && !filtros.idades.includes(faixaIdade(lead))) return false;
    if (ignorarCampo !== 'generos' && filtros.generos.length && !filtros.generos.includes(lead.genero || 'Não informado')) return false;
    if (ignorarCampo !== 'prioridades' && filtros.prioridades.length && !filtros.prioridades.includes(PRIORIDADES[lead.prioridade]?.[0] || lead.prioridade)) return false;
    if (ignorarCampo !== 'whatsapp' && filtros.whatsapp !== 'todos' && lead.temWhatsapp !== (filtros.whatsapp === 'sim')) return false;
    if (ignorarCampo !== 'email' && filtros.email !== 'todos' && Boolean(lead.email) !== (filtros.email === 'sim')) return false;
    if (ignorarCampo !== 'estudos' && filtros.estudos !== 'todos' && lead.estudoAtivo !== (filtros.estudos === 'sim')) return false;
    if (ignorarCampo !== 'vip' && filtros.vip !== 'todos' && lead.vipHistorico !== (filtros.vip === 'sim')) return false;
    if (ignorarCampo !== 'religiao' && filtros.religiao !== 'todos' && normalizar(lead.religiao).includes('adventista') !== (filtros.religiao === 'adventista')) return false;
    if (ignorarCampo !== 'tempo' && filtros.tempo !== 'todos' && faixaTempo(lead.diasSemContato) !== filtros.tempo) return false;
    return true;
  });
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
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const leadsVisiveis = useMemo(() => {
    if (!categoriaAtiva) return leads;
    if (categoriaAtiva === 'igrejas') return [];
    return leads.filter((lead) => lead.prioridade === categoriaAtiva);
  }, [categoriaAtiva, leads]);
  const pontosLeads = useMemo(() => leadsVisiveis.filter(coordenadasValidas).slice(0, 300), [leadsVisiveis]);
  const pontosIgrejas = useMemo(() => igrejas.filter(coordenadasValidas), [igrejas]);
  const pontos = useMemo(() => [...pontosLeads, ...pontosIgrejas], [pontosIgrejas, pontosLeads]);
  const centro = pontos[0] ? [Number(pontos[0].latitude), Number(pontos[0].longitude)] : [-23.5505, -46.6333];
  const exatos = leadsVisiveis.filter((item) => coordenadasValidas(item) && !ehAproximada(item)).length;
  const aproximados = leadsVisiveis.filter((item) => coordenadasValidas(item) && ehAproximada(item)).length;
  const contagensPrioridade = useMemo(() => leads.reduce((totais, lead) => {
    totais[lead.prioridade] = (totais[lead.prioridade] || 0) + 1;
    return totais;
  }, {}), [leads]);
  const selecionarCategoria = (categoria) => setCategoriaAtiva((atual) => atual === categoria ? null : categoria);
  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-lg">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-white to-emerald-50 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Mapa dos leads filtrados</p>
          <h2 className="mt-1 text-2xl font-bold text-[#1A3A6B]">Pontos com leads e igrejas</h2>
          <p className="mt-1 text-sm text-slate-500">{numero(exatos)} coordenadas exatas · {numero(aproximados)} aproximadas · {numero(leadsVisiveis.length - exatos - aproximados)} sem coordenadas</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold" aria-label="Filtrar pontos do mapa">
          {Object.entries(PRIORIDADES).map(([chave, [rotulo, cor]]) => {
            const ativo = !categoriaAtiva || categoriaAtiva === chave;
            return <button type="button" key={chave} aria-pressed={ativo} onClick={() => selecionarCategoria(chave)} className={`rounded-full border px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${ativo ? 'border-slate-200 bg-white text-slate-900' : 'border-transparent bg-white/50 text-slate-400 opacity-60'}`}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: cor }} />{rotulo} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{numero(contagensPrioridade[chave])}</span></button>;
          })}
          <button type="button" aria-pressed={!categoriaAtiva || categoriaAtiva === 'igrejas' || Boolean(PRIORIDADES[categoriaAtiva])} onClick={() => selecionarCategoria('igrejas')} className={`rounded-full border px-3 py-2 text-emerald-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${categoriaAtiva === 'igrejas' || !categoriaAtiva || PRIORIDADES[categoriaAtiva] ? 'border-emerald-100 bg-white' : 'border-transparent bg-white/50 opacity-60'}`}><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />Igrejas {numero(pontosIgrejas.length)}</button>
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
        <p>Clique nas cores para filtrar o mapa. As igrejas permanecem visíveis junto aos leads para referência territorial.</p>
        <a className="btn-outline whitespace-nowrap" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/#map=11/${centro[0]}/${centro[1]}`}>Abrir no OSM</a>
      </div>
    </section>
  );
}

function CardResumo({ titulo, valor, detalhe, classe }) {
  return <div className={`rounded-2xl p-5 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${classe}`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/85">{titulo}</p><p className="mt-5 text-3xl font-bold">{numero(valor)}</p><p className="mt-1 text-sm text-white/80">{detalhe}</p></div>;
}

function contar(lista, seletor) {
  const mapa = new Map();
  lista.forEach((item) => { const nome = String(seletor(item) || 'Não informado'); mapa.set(nome, (mapa.get(nome) || 0) + 1); });
  return [...mapa.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export default function FiltragemAvancadaNovoTempo() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = location.pathname.startsWith('/direto') ? '/direto' : '';
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [limite, setLimite] = useState(80);
  const [leadSelecionado, setLeadSelecionado] = useState(null);

  useEffect(() => {
    api.get('/interessados-nt/filtragem-avancada').then(({ data }) => setDados(data)).catch((falha) => setErro(falha.response?.data?.erro || 'Não foi possível carregar a filtragem avançada.'));
  }, []);

  const leads = useMemo(() => dados?.leads || [], [dados?.leads]);
  const opcoes = useMemo(() => ({
    distritos: contar(aplicarFiltros(leads, filtros, 'distritos'), (x) => x.distrito),
    bairros: contar(aplicarFiltros(leads, filtros, 'bairros'), (x) => x.bairro),
    materiais: contar(aplicarFiltros(leads, filtros, 'materiais'), (x) => x.material),
    idades: contar(aplicarFiltros(leads, filtros, 'idades'), faixaIdade),
    generos: contar(aplicarFiltros(leads, filtros, 'generos'), (x) => x.genero),
    prioridades: contar(aplicarFiltros(leads, filtros, 'prioridades'), (x) => PRIORIDADES[x.prioridade]?.[0] || x.prioridade),
  }), [filtros, leads]);

  const facetasSelect = useMemo(() => {
    const whatsapp = aplicarFiltros(leads, filtros, 'whatsapp');
    const email = aplicarFiltros(leads, filtros, 'email');
    const estudos = aplicarFiltros(leads, filtros, 'estudos');
    const vip = aplicarFiltros(leads, filtros, 'vip');
    const religiao = aplicarFiltros(leads, filtros, 'religiao');
    const tempo = aplicarFiltros(leads, filtros, 'tempo');
    const quantidade = (lista, teste) => lista.filter(teste).length;
    return {
      whatsapp: { total: whatsapp.length, opcoes: [{ valor: 'sim', rotulo: 'Com WhatsApp', quantidade: quantidade(whatsapp, (lead) => lead.temWhatsapp) }, { valor: 'nao', rotulo: 'Sem WhatsApp', quantidade: quantidade(whatsapp, (lead) => !lead.temWhatsapp) }] },
      email: { total: email.length, opcoes: [{ valor: 'sim', rotulo: 'Com e-mail', quantidade: quantidade(email, (lead) => Boolean(lead.email)) }, { valor: 'nao', rotulo: 'Sem e-mail', quantidade: quantidade(email, (lead) => !lead.email) }] },
      estudos: { total: estudos.length, opcoes: [{ valor: 'sim', rotulo: 'Ativo', quantidade: quantidade(estudos, (lead) => lead.estudoAtivo) }, { valor: 'nao', rotulo: 'Sem estudo ativo', quantidade: quantidade(estudos, (lead) => !lead.estudoAtivo) }] },
      vip: { total: vip.length, opcoes: [{ valor: 'sim', rotulo: 'VIP', quantidade: quantidade(vip, (lead) => lead.vipHistorico) }, { valor: 'nao', rotulo: 'Não VIP', quantidade: quantidade(vip, (lead) => !lead.vipHistorico) }] },
      religiao: { total: religiao.length, opcoes: [{ valor: 'adventista', rotulo: 'Adventista', quantidade: quantidade(religiao, (lead) => normalizar(lead.religiao).includes('adventista')) }, { valor: 'outra', rotulo: 'Outras', quantidade: quantidade(religiao, (lead) => !normalizar(lead.religiao).includes('adventista')) }] },
      tempo: { total: tempo.length, opcoes: ['Até 3 meses', '3 meses a 1 ano', '1 a 2 anos', '2 a 5 anos', '5+ anos', 'Não informado'].map((faixa) => ({ valor: faixa, rotulo: faixa, quantidade: quantidade(tempo, (lead) => faixaTempo(lead.diasSemContato) === faixa) })) },
    };
  }, [filtros, leads]);

  const filtrados = useMemo(() => aplicarFiltros(leads, filtros), [filtros, leads]);

  const igrejasFiltradas = useMemo(() => (dados?.igrejas || []).filter((igreja) => !filtros.distritos.length || filtros.distritos.some((nome) => normalizar(nome) === normalizar(igreja.distrito))), [dados?.igrejas, filtros.distritos]);
  const alterar = (campo, valor) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor, ...(campo === 'distritos' ? { bairros: [] } : {}) }));
    setLimite(80);
  };
  const totalWhats = filtrados.filter((x) => x.temWhatsapp).length;
  const totalQuentes = filtrados.filter((x) => x.prioridade === 'Hot').length;
  const reativar = filtrados.filter((x) => Number(x.diasSemContato) > 365).length;

  const exportar = () => exportarListaLeadsPdf(filtrados);

  if (!dados && !erro) return <LoadingState mensagem="Carregando a filtragem avançada..." />;
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 animate-fade-in sm:p-6 lg:p-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <button type="button" className="btn-outline mb-5" onClick={() => navigate(`${prefix}/interessados-nt`)}>← Voltar aos interessados</button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">CRM de leads</p><h1 className="mt-2 text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Filtragem Avançada</h1><p className="mt-2 text-slate-500">Encontre os contatos certos e visualize leads e igrejas no mapa.</p></div><div className="rounded-2xl bg-emerald-50 px-6 py-4 text-right"><p className="text-xs uppercase tracking-wider text-emerald-700">Resultado</p><p className="text-3xl font-bold text-emerald-950">{numero(filtrados.length)}</p></div></div>
      </header>
      {erro && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{erro}</div>}
      {dados && <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><CardResumo titulo="Total de leads" valor={filtrados.length} detalhe="resultado dos filtros" classe="bg-gradient-to-br from-blue-600 to-cyan-600"/><CardResumo titulo="Com WhatsApp" valor={totalWhats} detalhe="aptos para contato" classe="bg-gradient-to-br from-emerald-500 to-teal-700"/><CardResumo titulo="Quentes" valor={totalQuentes} detalhe="prioridade para ação" classe="bg-gradient-to-br from-red-600 to-orange-500"/><CardResumo titulo="Reativar" valor={reativar} detalhe="sem contato há mais de 1 ano" classe="bg-gradient-to-br from-violet-600 to-fuchsia-600"/></div>
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
            <div><h2 className="text-xl font-bold text-[#1A3A6B]">Lista de leads</h2><p className="text-sm text-slate-500">{numero(filtrados.length)} leads encontrados. Exibindo {numero(Math.min(limite, filtrados.length))}. Clique em um lead para ver todos os dados.</p></div>
            <button type="button" onClick={exportar} disabled={!filtrados.length} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Exportar filtragem em PDF</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-left text-xs uppercase tracking-wider text-white"><tr><th className="p-4">Nome</th><th className="p-4">WhatsApp</th><th className="p-4">Distrito</th><th className="p-4">Bairro</th><th className="p-4">Material</th><th className="p-4">Prioridade</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.slice(0, limite).map((lead, i) => (
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
          {limite < filtrados.length && <div className="border-t border-slate-100 p-4 text-center"><button type="button" className="btn-outline" onClick={() => setLimite((x) => x + 80)}>Carregar mais 80</button></div>}
        </section>
      </>}
      <ModalLeadNovoTempo lead={leadSelecionado} igrejas={dados?.igrejas || []} onFechar={() => setLeadSelecionado(null)} />
    </div>
  );
}
