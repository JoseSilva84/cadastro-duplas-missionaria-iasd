import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import { toast } from '../lib/toast';
import { useAuth, PERFIS, ehSomenteLeitura } from '../contexts/AuthContext';
import {
  ANO_CALENDARIO, DATA_MAX, DATA_MIN, DEPARTAMENTOS, INICIO_LINHA_TEMPO, criarModelo2027,
} from '../lib/calendarioModelo2027';

const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES = Array.from({ length: 12 }, (_, i) => {
  const total = INICIO_LINHA_TEMPO.mes - 1 + i;
  return { nome: NOMES_MES[total % 12], ano: INICIO_LINHA_TEMPO.ano + Math.floor(total / 12) };
});

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dia = (v) => (v ? String(v).slice(0, 10) : '');
const formatarDia = (v) => (v ? dia(v).split('-').reverse().join('/') : 'Sem data');
const indiceMes = (v) => {
  if (!v) return 0;
  const [a, m] = dia(v).split('-').map(Number);
  const i = (a - INICIO_LINHA_TEMPO.ano) * 12 + (m - INICIO_LINHA_TEMPO.mes);
  return Math.min(Math.max(i, 0), 11);
};
const corAcao = (a) => (DEPARTAMENTOS[a.departamento] || DEPARTAMENTOS.OUTRO).cor;

let contador = 0;
const chave = () => `k${Date.now()}-${contador += 1}`;

const normalizar = (eventos) => eventos.map((e) => ({
  ...e,
  _k: chave(),
  dataInicio: dia(e.dataInicio),
  dataFim: dia(e.dataFim),
  acoes: (e.acoes || []).map((a) => ({
    ...a,
    _k: chave(),
    data: dia(a.data),
    responsavel: a.responsavel || '',
    planejamento: a.planejamento || '',
    // O formulario usa um unico valor de orcamento por acao.
    valor: (a.orcamento || []).reduce((s, o) => s + Number(o.quantidade || 0) * Number(o.valorUnit || 0), 0),
  })),
}));

const paraApi = (eventos) => eventos.map((e) => ({
  nome: e.nome,
  tipo: e.tipo,
  dataInicio: e.dataInicio || null,
  dataFim: e.dataFim || null,
  acoes: e.acoes.map((a) => ({
    nome: a.nome,
    departamento: a.departamento,
    responsavel: a.responsavel,
    data: a.data || null,
    planejamento: a.planejamento,
    status: a.status || 'PLANEJADA',
    orcamento: Number(a.valor) > 0 ? [{ descricao: 'Orçamento', quantidade: 1, valorUnit: Number(a.valor) }] : [],
  })),
}));

const totalEvento = (e) => e.acoes.reduce((s, a) => s + Number(a.valor || 0), 0);

// ---------- Linha do tempo (grafico) ----------
const LARG_MES = 128;
const ALT_EVENTO = 58;
const ALT_ACAO = 50;
const TOPO_EVENTOS = 56;
const FOLGA = 96;

function LinhaDoTempo({ eventos, onEvento }) {
  const layout = useMemo(() => {
    const ocupacaoEv = Array(12).fill(0);
    const evPos = eventos.map((e) => {
      const m = indiceMes(e.dataInicio);
      const linha = ocupacaoEv[m]; ocupacaoEv[m] += 1;
      return { e, m, linha };
    });
    const linhasEv = Math.max(1, ...ocupacaoEv);
    const topoAcoes = TOPO_EVENTOS + linhasEv * (ALT_EVENTO + 10) + FOLGA;

    const ocupacaoAc = Array(12).fill(0);
    const acPos = [];
    eventos.forEach((e, ei) => e.acoes.forEach((a) => {
      const m = indiceMes(a.data || e.dataInicio);
      const linha = ocupacaoAc[m]; ocupacaoAc[m] += 1;
      acPos.push({ a, e, ei, m, linha });
    }));
    const linhasAc = Math.max(1, ...ocupacaoAc);
    const altura = topoAcoes + linhasAc * (ALT_ACAO + 8) + 16;
    return { evPos, acPos, topoAcoes, altura };
  }, [eventos]);

  const yEv = (linha) => TOPO_EVENTOS + linha * (ALT_EVENTO + 10);
  const yAc = (linha) => layout.topoAcoes + linha * (ALT_ACAO + 8);
  const evPorObjeto = new Map(layout.evPos.map((p) => [p.e._k, p]));

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
      <div className="relative" style={{ width: LARG_MES * 12, height: layout.altura }}>
        {/* colunas dos meses */}
        <div className="absolute inset-0 flex">
          {MESES.map((m, i) => (
            <div key={`${m.nome}-${m.ano}`} className={`h-full border-r-2 border-slate-800/80 ${i % 2 ? 'bg-slate-50' : 'bg-white'}`} style={{ width: LARG_MES }} />
          ))}
        </div>
        {/* faixa "linha do tempo" */}
        <div className="absolute left-0 right-0 flex bg-[#FFC000]" style={{ top: 0, height: 36 }}>
          {MESES.map((m) => (
            <div key={`${m.nome}-${m.ano}`} className="flex flex-col items-center justify-center border-r-2 border-slate-800/80 text-xs font-bold uppercase text-slate-900" style={{ width: LARG_MES }}>
              {m.nome}<span className="text-[10px] font-semibold opacity-70">{m.ano}</span>
            </div>
          ))}
        </div>
        <p className="absolute left-2 text-[10px] font-bold uppercase tracking-widest text-slate-400" style={{ top: 38 }}>Eventos</p>
        <p className="absolute left-2 text-[10px] font-bold uppercase tracking-widest text-slate-400" style={{ top: layout.topoAcoes - 16 }}>Ações (planejamento e orçamento)</p>

        {/* setas das acoes para o evento */}
        <svg className="pointer-events-none absolute left-0 top-0" width={LARG_MES * 12} height={layout.altura}>
          <defs>
            <marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="#1A3A6B" />
            </marker>
          </defs>
          {layout.acPos.map(({ a, e, m, linha }) => {
            const ev = evPorObjeto.get(e._k);
            if (!ev) return null;
            const x1 = m * LARG_MES + LARG_MES / 2;
            const y1 = yAc(linha);
            const x2 = ev.m * LARG_MES + LARG_MES / 2;
            const y2 = yEv(ev.linha) + ALT_EVENTO;
            const meio = (y1 + y2) / 2;
            return <path key={a._k} d={`M${x1} ${y1} C ${x1} ${meio}, ${x2} ${meio}, ${x2} ${y2 + 2}`} fill="none" stroke="#1A3A6B" strokeOpacity="0.55" strokeWidth="1.6" markerEnd="url(#seta)" />;
          })}
        </svg>

        {/* eventos */}
        {layout.evPos.map(({ e, m, linha }) => (
          <button key={e._k} type="button" onClick={() => onEvento(e._k)} title={`${e.nome} — ${formatarDia(e.dataInicio)}`}
            className="absolute overflow-hidden rounded-md border-2 border-[#C9963A] bg-[#FFE08A] px-2 text-left text-[13px] font-extrabold leading-tight text-[#1A3A6B] shadow transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ left: m * LARG_MES + 6, top: yEv(linha), width: LARG_MES - 12, height: ALT_EVENTO }}>
            {e.nome}
            <span className="block text-[10px] font-semibold text-slate-600">{formatarDia(e.dataInicio)} · {moeda(totalEvento(e))}</span>
          </button>
        ))}

        {/* acoes */}
        {layout.acPos.map(({ a, e, m, linha }) => (
          <button key={a._k} type="button" onClick={() => onEvento(e._k, a._k)} title={`${a.nome} → ${e.nome}`}
            className="absolute overflow-hidden rounded-md px-2 text-left text-[12px] font-bold leading-tight text-white shadow transition hover:-translate-y-0.5 hover:shadow-lg"
            style={{ left: m * LARG_MES + 6, top: yAc(linha), width: LARG_MES - 12, height: ALT_ACAO, backgroundColor: corAcao(a) }}>
            {a.nome}
            <span className="block text-[10px] font-semibold opacity-90">{a.data ? formatarDia(a.data).slice(0, 5) : ''} · {moeda(a.valor)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Modal do evento ----------
function EventoModal({ inicial, destaqueK, editavel, novo, onFechar, onSalvar, onExcluir, salvando }) {
  const [form, setForm] = useState(inicial);
  const setEv = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setAc = (k, campo, valor) => setForm((f) => ({ ...f, acoes: f.acoes.map((a) => (a._k === k ? { ...a, [campo]: valor } : a)) }));
  const novaAcao = () => setForm((f) => ({
    ...f, acoes: [...f.acoes, { _k: chave(), nome: '', departamento: 'OUTRO', responsavel: '', data: '', planejamento: '', status: 'PLANEJADA', valor: '' }],
  }));

  useEffect(() => {
    if (destaqueK) document.getElementById(`acao-${destaqueK}`)?.scrollIntoView({ block: 'center' });
  }, [destaqueK]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={onFechar} role="dialog" aria-modal="true">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Evento do calendário</p>
            <input className="input-field mt-1 text-lg font-bold" value={form.nome} disabled={!editavel} placeholder="Nome do evento" onChange={(e) => setEv('nome', e.target.value)} />
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="text-xs font-bold text-slate-500">Início
                <input type="date" className="input-field mt-1" disabled={!editavel} min={DATA_MIN} max={DATA_MAX} value={form.dataInicio} onChange={(e) => setEv('dataInicio', e.target.value)} />
              </label>
              <label className="text-xs font-bold text-slate-500">Fim
                <input type="date" className="input-field mt-1" disabled={!editavel} min={DATA_MIN} max={DATA_MAX} value={form.dataFim} onChange={(e) => setEv('dataFim', e.target.value)} />
              </label>
            </div>
          </div>
          <button type="button" className="btn-outline px-3 py-1 text-sm" onClick={onFechar}>Fechar</button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          <p className="text-sm font-bold text-[#1A3A6B]">Ações missionárias de {form.nome || 'este evento'}</p>
          {form.acoes.map((a) => (
            <div key={a._k} id={`acao-${a._k}`} className={`rounded-xl border bg-slate-50 p-3 ${a._k === destaqueK ? 'ring-2 ring-[#C9963A]' : ''}`} style={{ borderLeft: `5px solid ${corAcao(a)}` }}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_190px]">
                <label className="text-xs font-bold text-slate-500">Ação missionária
                  <input className="input-field mt-1" disabled={!editavel} value={a.nome} placeholder="Ex.: Feira de Saúde" onChange={(e) => setAc(a._k, 'nome', e.target.value)} />
                </label>
                <label className="text-xs font-bold text-slate-500">Departamento
                  <select className="input-field mt-1" disabled={!editavel} value={a.departamento || 'OUTRO'} onChange={(e) => setAc(a._k, 'departamento', e.target.value)}>
                    {Object.entries(DEPARTAMENTOS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="mt-3 block text-xs font-bold text-slate-500">Descrição do que será feito
                <textarea className="input-field mt-1 min-h-[72px]" disabled={!editavel} value={a.planejamento} placeholder="Planejamento: público, local, equipe, materiais..." onChange={(e) => setAc(a._k, 'planejamento', e.target.value)} />
              </label>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <label className="text-xs font-bold text-slate-500">Data
                  <input type="date" className="input-field mt-1" disabled={!editavel} min={DATA_MIN} max={DATA_MAX} value={a.data} onChange={(e) => setAc(a._k, 'data', e.target.value)} />
                </label>
                <label className="text-xs font-bold text-slate-500">Orçamento (R$)
                  <input type="number" min="0" step="0.01" className="input-field mt-1" disabled={!editavel} value={a.valor} placeholder="0,00" onChange={(e) => setAc(a._k, 'valor', e.target.value)} />
                </label>
                <label className="text-xs font-bold text-slate-500">Responsável
                  <input className="input-field mt-1" disabled={!editavel} value={a.responsavel} onChange={(e) => setAc(a._k, 'responsavel', e.target.value)} />
                </label>
                {editavel && (
                  <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600" onClick={() => setForm((f) => ({ ...f, acoes: f.acoes.filter((x) => x._k !== a._k) }))}>Remover</button>
                )}
              </div>
            </div>
          ))}
          {form.acoes.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-400">Nenhuma ação neste evento ainda.</p>}
          {editavel && <button type="button" className="btn-outline px-3 py-2 text-sm" onClick={novaAcao}>+ Adicionar ação</button>}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-[#1A3A6B]">Total do evento: {moeda(totalEvento(form))}</p>
          {editavel && (
            <div className="flex gap-2">
              {!novo && <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600" onClick={onExcluir}>Excluir evento</button>}
              <button type="button" className="btn-primary px-5 py-2 text-sm disabled:opacity-50" disabled={salvando} onClick={() => onSalvar(form)}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Pagina ----------
export default function CalendarioMissionario() {
  const { usuario } = useAuth();
  const location = useLocation();
  const [igrejas, setIgrejas] = useState([]);
  const [igrejaId, setIgrejaId] = useState('');
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoCal, setCarregandoCal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modal, setModal] = useState(null); // { evento, destaqueK, novo }

  const editavel = !ehSomenteLeitura(usuario)
    && [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.DIRETOR_MISSIONARIO_IGREJA].includes(usuario?.perfil);

  useEffect(() => {
    api.get('/igrejas').then((res) => {
      const lista = Array.isArray(res.data) ? res.data : [];
      setIgrejas(lista);
      const url = new URLSearchParams(location.search).get('igrejaId');
      const inicial = lista.find((i) => String(i.id) === String(url)) || lista[0];
      if (inicial) setIgrejaId(String(inicial.id));
    }).catch(() => toast.error('Erro ao carregar igrejas.')).finally(() => setCarregando(false));
  }, [location.search]);

  useEffect(() => {
    if (!igrejaId) return;
    setCarregandoCal(true);
    api.get('/calendario-missionario', { params: { igrejaId, ano: ANO_CALENDARIO } })
      .then((res) => setEventos(normalizar(res.data.eventos || [])))
      .catch(() => toast.error('Erro ao carregar o calendário missionário.'))
      .finally(() => setCarregandoCal(false));
  }, [igrejaId]);

  const ordenados = useMemo(() => [...eventos].sort((a, b) => (a.dataInicio || '9').localeCompare(b.dataInicio || '9')), [eventos]);
  const totalAcoes = eventos.reduce((s, e) => s + e.acoes.length, 0);
  const totalAno = eventos.reduce((s, e) => s + totalEvento(e), 0);
  const igreja = igrejas.find((i) => String(i.id) === String(igrejaId));

  const persistir = async (lista) => {
    setSalvando(true);
    try {
      const res = await api.put('/calendario-missionario', { igrejaId: Number(igrejaId), ano: ANO_CALENDARIO, eventos: paraApi(lista) });
      setEventos(normalizar(res.data.eventos || []));
      toast.success('Calendário missionário salvo.');
      return true;
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((e) => e.msg).join(', ') : err.response?.data?.erro || 'Erro ao salvar o calendário.');
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const abrirEvento = (eventoK, acaoK) => {
    const evento = eventos.find((e) => e._k === eventoK);
    if (evento) setModal({ evento, destaqueK: acaoK || null, novo: false });
  };
  const abrirNovo = () => setModal({
    evento: { _k: chave(), nome: '', tipo: 'OUTRO', dataInicio: '', dataFim: '', acoes: [] }, destaqueK: null, novo: true,
  });

  const salvarEvento = async (form) => {
    if (!form.nome.trim()) { toast.error('Informe o nome do evento.'); return; }
    if (form.acoes.some((a) => !a.nome.trim())) { toast.error('Preencha o nome de todas as ações ou remova as vazias.'); return; }
    const existe = eventos.some((e) => e._k === form._k);
    const lista = existe ? eventos.map((e) => (e._k === form._k ? form : e)) : [...eventos, form];
    if (await persistir(lista)) setModal(null);
  };

  const excluirEvento = async () => {
    if (!window.confirm(`Excluir o evento "${modal.evento.nome}" e todas as suas ações?`)) return;
    if (await persistir(eventos.filter((e) => e._k !== modal.evento._k))) setModal(null);
  };

  if (carregando) return <LoadingState mensagem="Carregando Calendário Missionário..." />;

  return (
    <div className="animate-fade-in-up">
      <div className="rounded-2xl border border-[#1A3A6B]/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Planejamento integrado {ANO_CALENDARIO}</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1A3A6B] sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>Calendário Missionário</h1>
            <p className="mt-1 text-sm text-slate-400">Linha do tempo dos eventos e ações, com planejamento e orçamento. Clique em um item para abrir.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {igrejas.length > 1 && (
              <label className="text-xs font-bold text-slate-500">Igreja
                <select className="input-field mt-1 min-w-[220px]" value={igrejaId} onChange={(e) => setIgrejaId(e.target.value)}>
                  {igrejas.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </label>
            )}
            {editavel && igrejaId && <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={abrirNovo}>+ Novo evento</button>}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[['Eventos', eventos.length, '#C9963A'], ['Ações', totalAcoes, '#0d9488'], ['Orçamento total', moeda(totalAno), '#1A3A6B']].map(([label, valor, cor]) => (
          <article key={label} className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: `${cor}35` }}>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold" style={{ color: cor }}>{valor}</p>
          </article>
        ))}
      </div>

      {!igreja ? (
        <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">Nenhuma igreja disponível no seu escopo.</p>
      ) : (
        <section className="mt-5 rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Linha do tempo · {igreja.nome}</h2>
            {editavel && eventos.length === 0 && !carregandoCal && (
              <button type="button" className="btn-outline px-3 py-2 text-sm disabled:opacity-50" disabled={salvando} onClick={() => persistir(normalizar(criarModelo2027()))}>Criar calendário com o modelo 2027</button>
            )}
          </div>

          {carregandoCal ? <p className="text-sm text-slate-400">Carregando...</p> : (
            <>
              <LinhaDoTempo eventos={ordenados} onEvento={abrirEvento} />
              <p className="mt-2 text-xs text-slate-400">Role para o lado para ver todos os meses. As setas ligam cada ação ao seu evento.</p>

              <h3 className="mt-5 text-sm font-bold uppercase tracking-widest text-[#C9963A]">Eventos</h3>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {ordenados.map((e) => (
                  <button key={e._k} type="button" onClick={() => abrirEvento(e._k)} className="rounded-xl border border-[#C9963A]/40 bg-[#FFF8E1] p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                    <span className="block font-bold text-[#1A3A6B]">{e.nome}</span>
                    <span className="mt-1 flex justify-between text-xs text-slate-500">
                      <span>{formatarDia(e.dataInicio)} · {e.acoes.length} ação(ões)</span>
                      <span className="font-bold">{moeda(totalEvento(e))}</span>
                    </span>
                  </button>
                ))}
                {eventos.length === 0 && <p className="text-sm text-slate-400">Nenhum evento cadastrado.</p>}
              </div>
            </>
          )}
        </section>
      )}

      {modal && (
        <EventoModal key={modal.evento._k} inicial={modal.evento} destaqueK={modal.destaqueK} novo={modal.novo} editavel={editavel}
          salvando={salvando} onFechar={() => setModal(null)} onSalvar={salvarEvento} onExcluir={excluirEvento} />
      )}
    </div>
  );
}
