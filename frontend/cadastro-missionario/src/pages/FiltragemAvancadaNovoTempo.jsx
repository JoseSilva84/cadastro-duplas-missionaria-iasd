import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';

const numero = (valor) => new Intl.NumberFormat('pt-BR').format(Number(valor) || 0);
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const PRIORIDADES = { Hot: ['Quente', '#dc2626'], Warm: ['Potencial', '#f97316'], Cool: ['Morno', '#2563eb'], Cold: ['Frio', '#334155'] };

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
          <input value={busca} onChange={(e) => setBusca(e.target.value)} className="input-field w-full pl-10 text-sm" placeholder={`Buscar ${titulo.toLowerCase()}...`} />
        </label>
      )}
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
        {visiveis.map((item) => <Alternador key={item.nome} ativo={selecionados.includes(item.nome)} quantidade={item.total} onClick={() => alternar(item.nome)}>{item.nome}</Alternador>)}
      </div>
    </section>
  );
}

function SelectFiltro({ titulo, valor, onChange, opcoes }) {
  return (
    <label className="rounded-2xl border border-slate-200 bg-white/75 p-4 shadow-sm">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-600">{titulo}</span>
      <select className="input-field w-full" value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="todos">Todos</option>
        {opcoes.map((opcao) => <option key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</option>)}
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

function Mapa({ leads, igrejas }) {
  const pontosLeads = useMemo(() => leads.filter(coordenadasValidas).slice(0, 300), [leads]);
  const pontosIgrejas = useMemo(() => igrejas.filter(coordenadasValidas), [igrejas]);
  const pontos = useMemo(() => [...pontosLeads, ...pontosIgrejas], [pontosIgrejas, pontosLeads]);
  const centro = pontos[0] ? [Number(pontos[0].latitude), Number(pontos[0].longitude)] : [-23.5505, -46.6333];
  const exatos = leads.filter((item) => coordenadasValidas(item) && !ehAproximada(item)).length;
  const aproximados = leads.filter((item) => coordenadasValidas(item) && ehAproximada(item)).length;
  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-lg">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-white to-emerald-50 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Mapa dos leads filtrados</p>
          <h2 className="mt-1 text-2xl font-bold text-[#1A3A6B]">Pontos com leads e igrejas</h2>
          <p className="mt-1 text-sm text-slate-500">{numero(exatos)} coordenadas exatas · {numero(aproximados)} aproximadas · {numero(leads.length - exatos - aproximados)} sem coordenadas</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {Object.entries(PRIORIDADES).map(([chave, [rotulo, cor]]) => <span key={chave} className="rounded-full bg-white px-3 py-2 shadow-sm"><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: cor }} />{rotulo}</span>)}
          <span className="rounded-full bg-white px-3 py-2 text-emerald-700 shadow-sm"><i className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />Igrejas {numero(pontosIgrejas.length)}</span>
        </div>
      </div>
      <div className="relative z-0 h-[520px] w-full">
        <MapContainer center={centro} zoom={9} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <AjustarMapa pontos={pontos} />
          {pontosLeads.map((lead, indice) => {
            const cor = PRIORIDADES[lead.prioridade]?.[1] || '#334155';
            return <CircleMarker key={`lead-${lead.id || indice}`} center={[Number(lead.latitude), Number(lead.longitude)]} radius={ehAproximada(lead) ? 6 : 7} pathOptions={{ color: '#fff', weight: 2, fillColor: cor, fillOpacity: ehAproximada(lead) ? 0.55 : 0.9, dashArray: ehAproximada(lead) ? '4 3' : undefined }}><Popup><strong>{lead.nome}</strong><br />{lead.distrito}<br />{PRIORIDADES[lead.prioridade]?.[0] || 'Sem prioridade'} · {ehAproximada(lead) ? 'coordenada aproximada' : 'coordenada exata'}</Popup></CircleMarker>;
          })}
          {pontosIgrejas.map((igreja, indice) => <CircleMarker key={`igreja-${indice}`} center={[Number(igreja.latitude), Number(igreja.longitude)]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#059669', fillOpacity: 1 }}><Popup><strong>⛪ {igreja.nome}</strong><br />{igreja.distrito}<br />{igreja.endereco || igreja.geoNomeExibicao || 'Endereço não informado'}<br />{ehAproximada(igreja) ? 'Coordenada aproximada' : 'Coordenada exata'}</Popup></CircleMarker>)}
        </MapContainer>
      </div>
      <div className="flex flex-col gap-2 border-t border-emerald-100 bg-emerald-50/60 px-5 py-4 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
        <p>Exibindo até 300 leads no mapa para manter a navegação rápida. As coordenadas válidas da fonte são preservadas sem alteração.</p>
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

  useEffect(() => {
    api.get('/interessados-nt/filtragem-avancada').then(({ data }) => setDados(data)).catch((falha) => setErro(falha.response?.data?.erro || 'Não foi possível carregar a filtragem avançada.'));
  }, []);

  const leads = useMemo(() => dados?.leads || [], [dados?.leads]);
  const opcoes = useMemo(() => ({
    distritos: contar(leads, (x) => x.distrito), bairros: contar(leads, (x) => x.bairro), materiais: contar(leads, (x) => x.material),
    idades: contar(leads, faixaIdade), generos: contar(leads, (x) => x.genero), prioridades: contar(leads, (x) => PRIORIDADES[x.prioridade]?.[0] || x.prioridade),
  }), [leads]);

  const filtrados = useMemo(() => leads.filter((lead) => {
    const textoBusca = normalizar(filtros.busca);
    if (textoBusca && !normalizar([lead.nome, lead.email, lead.whatsapp, lead.distrito, lead.bairro, lead.material, lead.religiao, lead.id].join(' ')).includes(textoBusca)) return false;
    if (filtros.distritos.length && !filtros.distritos.includes(lead.distrito || 'Não informado')) return false;
    if (filtros.bairros.length && !filtros.bairros.includes(lead.bairro || 'Não informado')) return false;
    if (filtros.materiais.length && !filtros.materiais.includes(lead.material || 'Não informado')) return false;
    if (filtros.idades.length && !filtros.idades.includes(faixaIdade(lead))) return false;
    if (filtros.generos.length && !filtros.generos.includes(lead.genero || 'Não informado')) return false;
    if (filtros.prioridades.length && !filtros.prioridades.includes(PRIORIDADES[lead.prioridade]?.[0] || lead.prioridade)) return false;
    if (filtros.whatsapp !== 'todos' && lead.temWhatsapp !== (filtros.whatsapp === 'sim')) return false;
    if (filtros.email !== 'todos' && Boolean(lead.email) !== (filtros.email === 'sim')) return false;
    if (filtros.estudos !== 'todos' && lead.estudoAtivo !== (filtros.estudos === 'sim')) return false;
    if (filtros.vip !== 'todos' && lead.vipHistorico !== (filtros.vip === 'sim')) return false;
    if (filtros.religiao !== 'todos' && normalizar(lead.religiao).includes('adventista') !== (filtros.religiao === 'adventista')) return false;
    if (filtros.tempo !== 'todos' && faixaTempo(lead.diasSemContato) !== filtros.tempo) return false;
    return true;
  }), [filtros, leads]);

  const igrejasFiltradas = useMemo(() => (dados?.igrejas || []).filter((igreja) => !filtros.distritos.length || filtros.distritos.some((nome) => normalizar(nome) === normalizar(igreja.distrito))), [dados?.igrejas, filtros.distritos]);
  const alterar = (campo, valor) => { setFiltros((atual) => ({ ...atual, [campo]: valor })); setLimite(80); };
  const totalWhats = filtrados.filter((x) => x.temWhatsapp).length;
  const totalQuentes = filtrados.filter((x) => x.prioridade === 'Hot').length;
  const reativar = filtrados.filter((x) => Number(x.diasSemContato) > 365).length;

  const exportar = () => {
    const celula = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const linhas = [['Nome', 'Email', 'WhatsApp', 'Distrito', 'Bairro', 'Material', 'Prioridade'], ...filtrados.map((x) => [x.nome, x.email, x.whatsapp, x.distrito, x.bairro, x.material, PRIORIDADES[x.prioridade]?.[0] || x.prioridade])];
    const blob = new Blob([`\uFEFF${linhas.map((linha) => linha.map(celula).join(';')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'leads-novo-tempo-filtrados.csv'; link.click(); URL.revokeObjectURL(url);
  };

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
            <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.15em] text-slate-600">Buscar</span><span className="relative block"><svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input value={filtros.busca} onChange={(e) => alterar('busca', e.target.value)} className="input-field w-full pl-12" placeholder="Nome, e-mail, distrito, bairro, material ou WhatsApp" /></span></label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2"><PainelOpcoes titulo="Distritos" pesquisavel opcoes={opcoes.distritos} selecionados={filtros.distritos} onChange={(v) => alterar('distritos', v)}/><PainelOpcoes titulo="Bairros" pesquisavel opcoes={opcoes.bairros} selecionados={filtros.bairros} onChange={(v) => alterar('bairros', v)}/><PainelOpcoes titulo="Materiais" pesquisavel opcoes={opcoes.materiais} selecionados={filtros.materiais} onChange={(v) => alterar('materiais', v)}/><div className="grid gap-4 sm:grid-cols-2"><PainelOpcoes titulo="Prioridade" opcoes={opcoes.prioridades} selecionados={filtros.prioridades} onChange={(v) => alterar('prioridades', v)}/><PainelOpcoes titulo="Idade" opcoes={opcoes.idades} selecionados={filtros.idades} onChange={(v) => alterar('idades', v)}/><PainelOpcoes titulo="Gênero" opcoes={opcoes.generos} selecionados={filtros.generos} onChange={(v) => alterar('generos', v)}/></div></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><SelectFiltro titulo="WhatsApp" valor={filtros.whatsapp} onChange={(v) => alterar('whatsapp', v)} opcoes={[{valor:'sim',rotulo:'Com WhatsApp'},{valor:'nao',rotulo:'Sem WhatsApp'}]}/><SelectFiltro titulo="E-mail" valor={filtros.email} onChange={(v) => alterar('email', v)} opcoes={[{valor:'sim',rotulo:'Com e-mail'},{valor:'nao',rotulo:'Sem e-mail'}]}/><SelectFiltro titulo="Estudos" valor={filtros.estudos} onChange={(v) => alterar('estudos', v)} opcoes={[{valor:'sim',rotulo:'Ativo'},{valor:'nao',rotulo:'Sem estudo ativo'}]}/><SelectFiltro titulo="VIP" valor={filtros.vip} onChange={(v) => alterar('vip', v)} opcoes={[{valor:'sim',rotulo:'VIP'},{valor:'nao',rotulo:'Não VIP'}]}/><SelectFiltro titulo="Religião" valor={filtros.religiao} onChange={(v) => alterar('religiao', v)} opcoes={[{valor:'adventista',rotulo:'Adventista'},{valor:'outra',rotulo:'Outras'}]}/><SelectFiltro titulo="Tempo" valor={filtros.tempo} onChange={(v) => alterar('tempo', v)} opcoes={['Até 3 meses','3 meses a 1 ano','1 a 2 anos','2 a 5 anos','5+ anos','Não informado'].map((x)=>({valor:x,rotulo:x}))}/></div>
        </section>
        <Mapa leads={filtrados} igrejas={igrejasFiltradas}/>
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg"><div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold text-[#1A3A6B]">Lista de leads</h2><p className="text-sm text-slate-500">{numero(filtrados.length)} leads encontrados. Exibindo {numero(Math.min(limite, filtrados.length))}.</p></div><button type="button" onClick={exportar} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700">Exportar filtragem em CSV</button></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-900 text-left text-xs uppercase tracking-wider text-white"><tr><th className="p-4">Nome</th><th className="p-4">WhatsApp</th><th className="p-4">Distrito</th><th className="p-4">Bairro</th><th className="p-4">Material</th><th className="p-4">Prioridade</th></tr></thead><tbody className="divide-y divide-slate-100">{filtrados.slice(0, limite).map((lead, i) => <tr key={lead.id || i} className="transition hover:bg-blue-50"><td className="p-4"><strong className="text-slate-900">{lead.nome}</strong><br/><span className="text-xs text-slate-400">{lead.email || 'Sem e-mail'}</span></td><td className="p-4 text-emerald-700">{lead.whatsapp || 'Não informado'}</td><td className="p-4">{lead.distrito}</td><td className="p-4">{lead.bairro || 'Não informado'}</td><td className="max-w-52 truncate p-4" title={lead.material}>{lead.material || 'Não informado'}</td><td className="p-4"><span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{background: PRIORIDADES[lead.prioridade]?.[1] || '#64748b'}}>{PRIORIDADES[lead.prioridade]?.[0] || 'Sem prioridade'}</span></td></tr>)}</tbody></table></div>{limite < filtrados.length && <div className="border-t border-slate-100 p-4 text-center"><button type="button" className="btn-outline" onClick={() => setLimite((x) => x + 80)}>Carregar mais 80</button></div>}</section>
      </>}
    </div>
  );
}
