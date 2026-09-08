import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import BackButton from '../components/BackButton';
import LoadingState from '../components/LoadingState';

const nf = new Intl.NumberFormat('pt-BR');
const numero = (valor) => nf.format(Number(valor) || 0);
const percentual = (parte, total) => total ? Math.round((Number(parte) / Number(total)) * 100) : 0;

const cores = {
  azul: ['#2563eb', '#0891b2'],
  verde: ['#059669', '#10b981'],
  laranja: ['#ea580c', '#f97316'],
  violeta: ['#7c3aed', '#c026d3'],
  ciano: ['#2563eb', '#0284c7'],
};

function CardKpi({ titulo, valor, detalhe, cor = cores.azul }) {
  return (
    <article
      className="relative min-h-40 overflow-hidden rounded-2xl p-5 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ background: `linear-gradient(135deg, ${cor[0]}, ${cor[1]})` }}
    >
      <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <p className="relative text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">{titulo}</p>
      <p className="relative mt-5 text-4xl font-black tracking-tight">{numero(valor)}</p>
      <p className="relative mt-2 text-sm font-medium text-white/85">{detalhe}</p>
    </article>
  );
}

function Barra({ nome, total, maximo, cor = '#3b82f6', detalhe }) {
  const largura = maximo ? Math.max(2, (total / maximo) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-slate-700">{nome}</span>
        <strong className="tabular-nums text-slate-900">{numero(total)}</strong>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${largura}%`, background: cor }} />
      </div>
      {detalhe && <p className="text-xs text-slate-400">{detalhe}</p>}
    </div>
  );
}

function CardDistribuicao({ titulo, itens = [], cor = '#3b82f6', vazio = 'Sem informação disponível' }) {
  const maximo = Math.max(0, ...itens.map((item) => item.total));
  return (
    <article className="rounded-2xl border border-white bg-white p-6 shadow-[0_18px_45px_rgba(30,58,95,0.08)]">
      <h2 className="text-lg font-bold text-[#173766]">{titulo}</h2>
      <div className="mt-5 space-y-4">
        {itens.length ? itens.map((item) => (
          <Barra key={item.nome} nome={item.nome} total={item.total} maximo={maximo} cor={item.cor || cor} />
        )) : <p className="text-sm text-slate-400">{vazio}</p>}
      </div>
    </article>
  );
}

function Cabecalho({ distrito, atualizadoEm, atualizando, onAtualizar, fallback }) {
  return (
    <header className="rounded-2xl border border-white bg-gradient-to-br from-white via-slate-50 to-blue-50 p-6 shadow-sm sm:p-8">
      <BackButton fallbackTo={fallback} className="mb-4" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            {distrito ? 'Distrito com dados detalhados' : 'Inteligência operacional'}
          </p>
          <h1 className="mt-2 text-3xl font-black text-[#10284e] sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
            {distrito ? `Análise — ${distrito}` : 'Análise dos Potenciais'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            {distrito
              ? 'Indicadores, perfil e leads priorizados deste distrito.'
              : 'Prioridades por distrito, perfil dos interessados e oportunidades para acompanhamento.'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          {atualizadoEm && <span className="text-xs text-slate-400">Atualizado em {new Date(atualizadoEm).toLocaleString('pt-BR')}</span>}
          <button type="button" className="btn-outline px-5 py-2.5" onClick={onAtualizar} disabled={atualizando}>
            {atualizando ? 'Atualizando...' : 'Atualizar análise'}
          </button>
        </div>
      </div>
    </header>
  );
}

const SelectFiltro = ({ rotulo, valor, onChange, children }) => (
  <label className="space-y-1.5">
    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{rotulo}</span>
    <select className="input-field min-h-11 bg-white" value={valor} onChange={(e) => onChange(e.target.value)}>{children}</select>
  </label>
);

function Filtros({ filtros, opcoes, onChange, onLimpar }) {
  return (
    <section className="rounded-2xl border border-white bg-white/95 p-5 shadow-[0_18px_45px_rgba(30,58,95,0.08)]">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <SelectFiltro rotulo="Distrito" valor={filtros.distrito} onChange={(v) => onChange('distrito', v)}>
          <option value="todos">Todos</option>
          {(opcoes?.distritos || []).map((item) => <option key={item} value={item}>{item}</option>)}
        </SelectFiltro>
        <SelectFiltro rotulo="Prioridade ML" valor={filtros.prioridade} onChange={(v) => onChange('prioridade', v)}>
          <option value="todos">Todas</option><option value="Hot">Quente</option><option value="Warm">Potencial</option><option value="Cool">Morno</option><option value="Cold">Frio</option>
        </SelectFiltro>
        <SelectFiltro rotulo="Status VIP" valor={filtros.vip} onChange={(v) => onChange('vip', v)}>
          <option value="todos">Todos</option><option value="1">Somente VIP</option><option value="0">Não VIP</option>
        </SelectFiltro>
        <SelectFiltro rotulo="WhatsApp" valor={filtros.whatsapp} onChange={(v) => onChange('whatsapp', v)}>
          <option value="todos">Todos</option><option value="1">Com WhatsApp</option><option value="0">Sem WhatsApp</option>
        </SelectFiltro>
        <SelectFiltro rotulo="Estudos ativos" valor={filtros.estudos} onChange={(v) => onChange('estudos', v)}>
          <option value="todos">Todos</option><option value="1">Com estudo</option><option value="0">Sem estudo</option>
        </SelectFiltro>
        <SelectFiltro rotulo="Gênero" valor={filtros.genero} onChange={(v) => onChange('genero', v)}>
          <option value="todos">Todos</option>
          {(opcoes?.generos || []).map((item) => <option key={item} value={item}>{item}</option>)}
        </SelectFiltro>
        <button type="button" onClick={onLimpar} className="btn-outline min-h-11 self-end">Limpar filtros</button>
      </div>
    </section>
  );
}

function CardsResumo({ resumo = {} }) {
  const total = resumo.total || 0;
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <CardKpi titulo="Contatos filtrados" valor={total} detalhe={`em ${numero(resumo.distritos)} distritos`} />
      <CardKpi titulo="Com WhatsApp" valor={resumo.comWhatsapp} detalhe={`${percentual(resumo.comWhatsapp, total)}% com telefone`} cor={cores.verde} />
      <CardKpi titulo="Contatos quentes" valor={resumo.quentes} detalhe={`${percentual(resumo.quentes, total)}% para ação rápida`} cor={cores.laranja} />
      <CardKpi titulo="VIPs" valor={resumo.vips} detalhe={`${percentual(resumo.vips, total)}% da base`} cor={cores.violeta} />
      <CardKpi titulo="Estudos ativos" valor={resumo.estudos} detalhe={`${percentual(resumo.estudos, total)}% em andamento`} cor={cores.ciano} />
    </section>
  );
}

function PrioridadesAcao({ itens = [], onAbrir }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div><h2 className="text-lg font-bold text-[#173766]">Prioridades de ação</h2><p className="text-sm text-slate-400">Atalhos calculados sobre os filtros atuais.</p></div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">ML aplicado</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {itens.map((item) => (
          <button key={item.titulo} type="button" onClick={() => onAbrir(item.distrito)} className="group rounded-2xl border border-white bg-white p-5 text-left shadow-[0_18px_45px_rgba(30,58,95,0.08)] transition hover:-translate-y-1 hover:shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: item.cor }}>{item.titulo}</span>
            <strong className="mt-3 block truncate text-xl text-[#10284e] group-hover:text-blue-600">{item.distrito}</strong>
            <p className="mt-2 text-sm text-slate-500"><b>{numero(item.total)}</b> {item.descricao}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function DonutPrioridades({ itens = [], total = 0 }) {
  const fatias = itens.reduce((resultado, item) => {
    const fim = resultado.acumulado + percentual(item.total, total);
    return { acumulado: fim, valores: [...resultado.valores, `${item.cor} ${resultado.acumulado}% ${fim}%`] };
  }, { acumulado: 0, valores: [] }).valores;
  return (
    <article className="rounded-2xl border border-white bg-white p-6 shadow-[0_18px_45px_rgba(30,58,95,0.08)]">
      <h2 className="text-lg font-bold text-[#173766]">Distribuição de prioridade ML</h2>
      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
        <div className="grid h-52 w-52 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${fatias.join(', ') || '#e2e8f0 0 100%'})` }}>
          <div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-inner"><span><small className="text-slate-400">Total</small><strong className="block text-2xl text-[#10284e]">{numero(total)}</strong></span></div>
        </div>
        <div className="w-full space-y-3">{itens.map((item) => <div key={item.nome} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2 text-slate-600"><i className="h-3 w-3 rounded-full" style={{ background: item.cor }} />{item.nome}</span><b>{numero(item.total)} · {percentual(item.total, total)}%</b></div>)}</div>
      </div>
    </article>
  );
}

function TabelaDistritos({ distritos = [], onAbrir }) {
  const [busca, setBusca] = useState('');
  const lista = useMemo(() => distritos.filter((item) => item.nome.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))), [busca, distritos]);
  return (
    <section className="rounded-2xl border border-white bg-white p-5 shadow-[0_18px_45px_rgba(30,58,95,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-lg font-bold text-[#173766]">Distritos — dados filtrados</h2><p className="mt-1 text-sm text-emerald-600">Clique no distrito para abrir sua análise detalhada.</p></div>
        <input className="input-field sm:max-w-xs" placeholder="Buscar distrito..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-100">
        <table className="min-w-[1000px] w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Distrito</th><th>Total</th><th>WhatsApp</th><th>Quentes</th><th>Potenciais</th><th>Mornos</th><th>Frios</th><th>VIPs</th><th>Pontuação</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{lista.map((item) => <tr key={item.nome} className="hover:bg-blue-50/60"><td className="p-3"><button type="button" className="font-bold text-blue-600 hover:underline" onClick={() => onAbrir(item.nome)}>{item.nome} ↗</button></td><td className="font-bold">{numero(item.total)}</td><td>{numero(item.comWhatsapp)}</td><td className="font-semibold text-orange-600">{numero(item.quentes)}</td><td className="font-semibold text-amber-600">{numero(item.potenciais)}</td><td>{numero(item.mornos)}</td><td>{numero(item.frios)}</td><td>{numero(item.vips)}</td><td>{item.pontuacaoMedia.toLocaleString('pt-BR')}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}

function VisaoGeral({ dados, filtros, setFiltros, atualizar, atualizando, abrirDistrito, fallback }) {
  return (
    <>
      <Cabecalho atualizadoEm={dados.atualizadoEm} atualizando={atualizando} onAtualizar={atualizar} fallback={fallback} />
      <Filtros filtros={filtros} opcoes={dados.filtrosDisponiveis} onChange={(campo, valor) => setFiltros((atual) => ({ ...atual, [campo]: valor }))} onLimpar={() => setFiltros(FILTROS_INICIAIS)} />
      <CardsResumo resumo={dados.resumo} />
      <PrioridadesAcao itens={dados.prioridadesAcao} onAbrir={abrirDistrito} />
      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <CardDistribuicao titulo="Top 15 distritos por volume" itens={dados.distritos.slice(0, 15)} />
        <DonutPrioridades itens={dados.prioridades} total={dados.resumo.total} />
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <CardDistribuicao titulo="Perfil religioso" itens={dados.religioes} cor="#8b5cf6" />
        <CardDistribuicao titulo="Tempo sem contato" itens={dados.tempoSemContato} cor="#f97316" />
      </section>
      <TabelaDistritos distritos={dados.distritos} onAbrir={abrirDistrito} />
    </>
  );
}

function GrupoIndicadores({ titulo, itens, total }) {
  return <CardDistribuicao titulo={titulo} itens={(itens || []).map((item) => ({ ...item, detalhe: `${percentual(item.total, total)}%` }))} />;
}

function ListaRanking({ titulo, itens = [], cor = '#3b82f6' }) {
  return (
    <article className="rounded-2xl border border-white bg-white p-6 shadow-[0_18px_45px_rgba(30,58,95,0.08)]">
      <h2 className="text-lg font-bold text-[#173766]">{titulo}</h2>
      <div className="mt-4 space-y-3">{itens.map((item, index) => <div key={`${item.nome}-${index}`} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-xs font-bold text-slate-500">#{index + 1}</span><span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{item.nome}</span><b className="rounded-full px-3 py-1 text-xs text-white" style={{ background: cor }}>{numero(item.total)}</b></div>)}</div>
    </article>
  );
}

function ListaLeads({ leads = [] }) {
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(60);
  const lista = useMemo(() => leads.filter((lead) => `${lead.nome} ${lead.whatsapp} ${lead.email} ${lead.bairro}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))), [busca, leads]);
  return (
    <section className="rounded-2xl border border-white bg-white p-5 shadow-[0_18px_45px_rgba(30,58,95,0.08)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold text-[#173766]">Leads do distrito por score</h2><p className="text-sm text-slate-400">Ordenados pela pontuação operacional.</p></div><input className="input-field sm:max-w-sm" placeholder="Buscar nome, telefone, e-mail ou bairro..." value={busca} onChange={(e) => { setBusca(e.target.value); setLimite(60); }} /></div>
      <div className="mt-5 space-y-3">{lista.slice(0, limite).map((lead, index) => {
        const prioridade = lead.prioridade || 'Cold';
        const tom = prioridade === 'Hot' ? 'bg-orange-500' : prioridade === 'Warm' ? 'bg-amber-500' : prioridade === 'Cool' ? 'bg-blue-500' : 'bg-slate-500';
        return <article key={lead.id || `${lead.nome}-${index}`} className="grid gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 p-4 sm:grid-cols-[auto_1fr_auto]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-sm font-bold">#{index + 1}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong className="text-base text-[#10284e]">{lead.nome}</strong><span className={`${tom} rounded-full px-2.5 py-1 text-[10px] font-bold uppercase text-white`}>{lead.prioridadeRotulo || prioridade}</span></div><p className="mt-1 break-words text-sm text-slate-500">{lead.bairro || lead.distrito} · {lead.whatsapp || 'sem telefone'} · {lead.email || 'sem e-mail'}</p><div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600"><span>WhatsApp: {lead.temWhatsapp ? 'sim' : 'não'}</span><span>VIP: {lead.vipHistorico ? 'sim' : 'não'}</span><span>Estudo: {lead.estudoAtivo ? 'sim' : 'não'}</span><span>Material: {lead.material || 'não informado'}</span></div></div><strong className="self-start rounded-xl bg-blue-600 px-4 py-2 text-lg text-white">{Number(lead.pontuacao || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</strong></article>;
      })}</div>
      {lista.length > limite && <button type="button" className="btn-outline mx-auto mt-5 block" onClick={() => setLimite((valor) => valor + 60)}>Carregar mais</button>}
    </section>
  );
}

function VisaoDistrito({ dados, atualizar, atualizando, fallback }) {
  const total = dados.resumo?.total || 0;
  return (
    <>
      <Cabecalho distrito={dados.distrito} atualizadoEm={dados.atualizadoEm} atualizando={atualizando} onAtualizar={atualizar} fallback={fallback} />
      <CardsResumo resumo={dados.resumo} />
      <section className="grid gap-5 lg:grid-cols-2"><CardDistribuicao titulo="Funil operacional do acompanhamento" itens={dados.funil} /><CardDistribuicao titulo="Canais realmente aproveitáveis" itens={dados.qualidadeContato} cor="#10b981" /></section>
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><GrupoIndicadores titulo="Qualidade do telefone" itens={dados.qualidadeTelefone} total={total} /><GrupoIndicadores titulo="Qualidade do e-mail" itens={dados.qualidadeEmail} total={total} /><GrupoIndicadores titulo="Com e sem descrição" itens={dados.descricao} total={total} /><GrupoIndicadores titulo="Marcadores históricos" itens={dados.vipHistorico} total={total} /></section>
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><GrupoIndicadores titulo="Contato iniciado" itens={dados.tentativas} total={total} /><GrupoIndicadores titulo="Resposta do lead" itens={dados.respostas} total={total} /><GrupoIndicadores titulo="Sinal de interesse" itens={dados.interesse} total={total} /><GrupoIndicadores titulo="Aceite de visita" itens={dados.visitas} total={total} /></section>
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4"><GrupoIndicadores titulo="Presença registrada" itens={dados.participacao} total={total} /><GrupoIndicadores titulo="Quantidade de materiais" itens={dados.materiaisQuantidade} total={total} /><ListaRanking titulo="Canais de tentativa" itens={dados.canais} /><ListaRanking titulo="Materiais principais" itens={dados.materiais} cor="#8b5cf6" /></section>
      <section className="grid gap-5 lg:grid-cols-3"><ListaRanking titulo="Concentração por cidade" itens={dados.cidades} cor="#059669" /><ListaRanking titulo="Concentração por bairro" itens={dados.bairros} /><ListaRanking titulo="Perfil religioso" itens={dados.religioes} cor="#8b5cf6" /></section>
      <ListaLeads leads={dados.leads} />
    </>
  );
}

const FILTROS_INICIAIS = { distrito: 'todos', prioridade: 'todos', vip: 'todos', whatsapp: 'todos', estudos: 'todos', genero: 'todos' };

export default function AnalisePotenciaisNovoTempo() {
  const { distrito } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');

  const parametros = useMemo(() => distrito ? {} : Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== 'todos')), [distrito, filtros]);

  const carregar = useCallback(async (forcar = false) => {
    forcar ? setAtualizando(true) : setCarregando(true);
    setErro('');
    try {
      const caminho = distrito ? `/interessados-nt/analise/distritos/${encodeURIComponent(distrito)}` : '/interessados-nt/analise';
      const { data } = await api.get(caminho, { params: { ...parametros, ...(forcar ? { atualizar: 1 } : {}) } });
      setDados(data);
    } catch (falha) {
      setErro(falha.response?.data?.erro || 'Não foi possível carregar a análise dos potenciais.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [distrito, parametros]);

  useEffect(() => { carregar(); }, [carregar]);

  if (carregando) return <LoadingState mensagem="Preparando análise dos potenciais..." />;
  const abrirDistrito = (nome) => navigate(`${prefix}/interessados-nt/analise/distritos/${encodeURIComponent(nome)}`);

  return (
    <main className={isDireto ? 'h-full overflow-y-auto bg-[#eef2f7]' : 'min-h-full bg-[#eef2f7]'}>
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
        {erro && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}
        {dados && (distrito
          ? <VisaoDistrito dados={dados} atualizar={() => carregar(true)} atualizando={atualizando} fallback={`${prefix}/interessados-nt/analise`} />
          : <VisaoGeral dados={dados} filtros={filtros} setFiltros={setFiltros} atualizar={() => carregar(true)} atualizando={atualizando} abrirDistrito={abrirDistrito} fallback={`${prefix}/interessados-nt`} />)}
      </div>
    </main>
  );
}
