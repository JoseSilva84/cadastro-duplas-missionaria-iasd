import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { toast } from '../lib/toast';
import {
  ANO_CALENDARIO, DEPARTAMENTOS, STATUS_ACAO, criarModelo2027,
} from '../lib/calendarioModelo2027';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dia = (v) => (v ? String(v).slice(0, 10) : '');
const mesDe = (v) => (v ? Number(String(v).slice(5, 7)) - 1 : -1);
const formatarDia = (v) => (v ? dia(v).split('-').reverse().join('/') : 'Sem data');

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
    orcamento: (a.orcamento || []).map((o) => ({ ...o, _k: chave() })),
  })),
}));

const totalAcao = (a) => a.orcamento.reduce((s, o) => s + Number(o.quantidade || 0) * Number(o.valorUnit || 0), 0);
const totalEvento = (e) => e.acoes.reduce((s, a) => s + totalAcao(a), 0);
const cor = (a) => (DEPARTAMENTOS[a.departamento] || DEPARTAMENTOS.OUTRO).cor;

function AcaoModal({ acao, editavel, onFechar, onSalvar, onExcluir }) {
  const [form, setForm] = useState(acao);
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const setItem = (i, campo, valor) => setForm((f) => ({
    ...f, orcamento: f.orcamento.map((o, idx) => (idx === i ? { ...o, [campo]: valor } : o)),
  }));
  const total = totalAcao(form);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onFechar}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Ação do calendário</p>
            <h3 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{form.nome || 'Nova ação'}</h3>
          </div>
          <button type="button" className="btn-outline px-3 py-1 text-sm" onClick={onFechar}>Fechar</button>
        </div>

        <fieldset disabled={!editavel} className="mt-4 space-y-3">
          <label className="block text-sm font-bold text-slate-500">Nome da ação
            <input className="input-field mt-1" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-500">Departamento
              <select className="input-field mt-1" value={form.departamento || 'OUTRO'} onChange={(e) => set('departamento', e.target.value)}>
                {Object.entries(DEPARTAMENTOS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-500">Status
              <select className="input-field mt-1" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(STATUS_ACAO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-500">Responsável
              <input className="input-field mt-1" value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} />
            </label>
            <label className="block text-sm font-bold text-slate-500">Data
              <input type="date" className="input-field mt-1" value={form.data} min={`${ANO_CALENDARIO}-01-01`} max={`${ANO_CALENDARIO}-12-31`} onChange={(e) => set('data', e.target.value)} />
            </label>
          </div>

          <label className="block text-sm font-bold text-slate-500">Planejamento
            <textarea className="input-field mt-1 min-h-[110px]" value={form.planejamento} onChange={(e) => set('planejamento', e.target.value)} placeholder="Como a ação será realizada, público, local, equipe..." />
          </label>

          <div>
            <p className="text-sm font-bold text-slate-500">Orçamento</p>
            <div className="mt-2 space-y-2">
              {form.orcamento.map((o, i) => (
                <div key={o._k} className="grid grid-cols-[1fr_70px_100px_auto] items-center gap-2">
                  <input className="input-field" placeholder="Descrição" value={o.descricao} onChange={(e) => setItem(i, 'descricao', e.target.value)} />
                  <input className="input-field" type="number" min="0" step="0.01" placeholder="Qtde" value={o.quantidade} onChange={(e) => setItem(i, 'quantidade', e.target.value)} />
                  <input className="input-field" type="number" min="0" step="0.01" placeholder="Valor" value={o.valorUnit} onChange={(e) => setItem(i, 'valorUnit', e.target.value)} />
                  <button type="button" className="px-2 text-lg font-bold text-red-500" aria-label="Remover item" onClick={() => set('orcamento', form.orcamento.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
              {form.orcamento.length === 0 && <p className="text-sm text-slate-400">Nenhum item de orçamento.</p>}
            </div>
            <button type="button" className="btn-outline mt-3 px-3 py-1 text-sm" onClick={() => set('orcamento', [...form.orcamento, { _k: chave(), descricao: '', quantidade: 1, valorUnit: 0 }])}>+ Item</button>
            <p className="mt-3 text-right text-lg font-bold text-[#1A3A6B]">Total: {moeda(total)}</p>
          </div>
        </fieldset>

        {editavel && (
          <div className="mt-5 flex justify-between gap-2">
            <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600" onClick={onExcluir}>Excluir ação</button>
            <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => onSalvar(form)}>Aplicar</button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function CalendarioMissionario({ igrejaId, editavel = false }) {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [sujo, setSujo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [edicao, setEdicao] = useState(null); // { eventoK, acao }

  useEffect(() => {
    api.get('/calendario-missionario', { params: { igrejaId, ano: ANO_CALENDARIO } })
      .then((res) => setEventos(normalizar(res.data.eventos || [])))
      .catch(() => toast.error('Erro ao carregar o calendário missionário.'))
      .finally(() => setCarregando(false));
  }, [igrejaId]);

  const alterar = (fn) => { setEventos(fn); setSujo(true); };
  const ordenados = useMemo(() => [...eventos].sort((a, b) => (a.dataInicio || '9').localeCompare(b.dataInicio || '9')), [eventos]);
  const totalAno = eventos.reduce((s, e) => s + totalEvento(e), 0);
  const totalAcoes = eventos.reduce((s, e) => s + e.acoes.length, 0);

  const salvar = async () => {
    setSalvando(true);
    try {
      const res = await api.put('/calendario-missionario', { igrejaId, ano: ANO_CALENDARIO, eventos });
      setEventos(normalizar(res.data.eventos || []));
      setSujo(false);
      toast.success('Calendário missionário salvo.');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar o calendário missionário.');
    } finally {
      setSalvando(false);
    }
  };

  const setEvento = (k, campo, valor) => alterar((lista) => lista.map((e) => (e._k === k ? { ...e, [campo]: valor } : e)));
  const novaAcao = (k) => {
    const acao = { _k: chave(), nome: '', departamento: 'OUTRO', responsavel: '', data: '', planejamento: '', status: 'PLANEJADA', orcamento: [] };
    setEdicao({ eventoK: k, acao, nova: true });
  };
  const aplicarAcao = (form) => {
    const { eventoK, nova } = edicao;
    if (!form.nome.trim()) { toast.error('Informe o nome da ação.'); return; }
    alterar((lista) => lista.map((e) => {
      if (e._k !== eventoK) return e;
      return { ...e, acoes: nova ? [...e.acoes, form] : e.acoes.map((a) => (a._k === form._k ? form : a)) };
    }));
    setEdicao(null);
  };
  const excluirAcao = () => {
    const { eventoK, acao, nova } = edicao;
    if (!nova) alterar((lista) => lista.map((e) => (e._k === eventoK ? { ...e, acoes: e.acoes.filter((a) => a._k !== acao._k) } : e)));
    setEdicao(null);
  };

  return (
    <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
      <button type="button" className="flex w-full flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between" onClick={() => setAberto((v) => !v)} aria-expanded={aberto}>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Calendário missionário {ANO_CALENDARIO}</p>
          <h3 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Eventos, ações e orçamento</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">
          {eventos.length} evento(s) · {totalAcoes} ação(ões) · {moeda(totalAno)} {aberto ? '▲' : '▼'}
        </span>
      </button>

      {aberto && (carregando ? <p className="mt-4 text-sm text-slate-400">Carregando...</p> : (
        <div className="mt-4">
          <div className="grid grid-cols-12 gap-1" aria-hidden="true">
            {MESES.map((m, i) => (
              <div key={m} className="rounded bg-white py-1 text-center text-[10px] font-bold uppercase text-slate-400 sm:text-xs">
                {m}
                <div className="mt-1 flex justify-center gap-0.5">
                  {eventos.filter((e) => mesDe(e.dataInicio) === i).map((e) => <span key={e._k} className="h-1.5 w-1.5 rounded-full bg-[#C9963A]" />)}
                </div>
              </div>
            ))}
          </div>

          {editavel && (
            <div className="mt-3 flex flex-wrap gap-2">
              {eventos.length === 0 && (
                <button type="button" className="btn-outline px-3 py-1 text-sm" onClick={() => { setEventos(normalizar(criarModelo2027())); setSujo(true); }}>Criar com modelo 2027</button>
              )}
              <button type="button" className="btn-outline px-3 py-1 text-sm" onClick={() => alterar((l) => [...l, { _k: chave(), nome: 'Novo evento', tipo: 'OUTRO', dataInicio: '', dataFim: '', acoes: [] }])}>+ Evento</button>
              <button type="button" className="btn-primary px-3 py-1 text-sm disabled:opacity-50" disabled={!sujo || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar calendário'}</button>
              {sujo && <span className="self-center text-xs font-bold text-amber-600">Alterações não salvas</span>}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {ordenados.map((evento) => (
              <div key={evento._k} className="rounded-xl border border-[#C9963A]/40 bg-white p-3 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    {editavel ? (
                      <input className="input-field font-bold" value={evento.nome} onChange={(e) => setEvento(evento._k, 'nome', e.target.value)} aria-label="Nome do evento" />
                    ) : (
                      <p className="font-bold text-[#1A3A6B]">{evento.nome}</p>
                    )}
                    {editavel ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input type="date" className="input-field w-auto" value={evento.dataInicio} min={`${ANO_CALENDARIO}-01-01`} max={`${ANO_CALENDARIO}-12-31`} onChange={(e) => setEvento(evento._k, 'dataInicio', e.target.value)} aria-label="Início" />
                        <input type="date" className="input-field w-auto" value={evento.dataFim} min={`${ANO_CALENDARIO}-01-01`} max={`${ANO_CALENDARIO}-12-31`} onChange={(e) => setEvento(evento._k, 'dataFim', e.target.value)} aria-label="Fim" />
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">{formatarDia(evento.dataInicio)} – {formatarDia(evento.dataFim)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#C9963A]/10 px-3 py-1 text-xs font-bold text-[#C9963A]">{moeda(totalEvento(evento))}</span>
                    {editavel && (
                      <button type="button" className="px-2 text-lg font-bold text-red-500" aria-label="Excluir evento" onClick={() => { if (window.confirm(`Excluir o evento "${evento.nome}" e suas ações?`)) alterar((l) => l.filter((e) => e._k !== evento._k)); }}>×</button>
                    )}
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 border-l-2 border-[#C9963A]/40 pl-3 sm:grid-cols-2 xl:grid-cols-3">
                  {evento.acoes.map((acao) => (
                    <button key={acao._k} type="button" onClick={() => setEdicao({ eventoK: evento._k, acao })} className="rounded-lg border-l-4 bg-slate-50 p-2 text-left transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderLeftColor: cor(acao) }}>
                      <span className="block text-sm font-bold text-[#1A3A6B]">{acao.nome}</span>
                      <span className="mt-1 flex items-center justify-between text-xs text-slate-400">
                        <span>{STATUS_ACAO[acao.status]}</span>
                        <span className="font-bold text-slate-600">{moeda(totalAcao(acao))}</span>
                      </span>
                    </button>
                  ))}
                  {editavel && (
                    <button type="button" className="rounded-lg border border-dashed border-slate-300 p-2 text-sm font-bold text-slate-400 hover:border-[#C9963A] hover:text-[#C9963A]" onClick={() => novaAcao(evento._k)}>+ Ação</button>
                  )}
                  {!editavel && evento.acoes.length === 0 && <p className="text-sm text-slate-400">Sem ações.</p>}
                </div>
              </div>
            ))}
            {eventos.length === 0 && <p className="rounded-xl bg-white p-4 text-sm text-slate-400">Nenhum evento no calendário {ANO_CALENDARIO}.</p>}
          </div>
        </div>
      ))}

      {edicao && (
        <AcaoModal key={edicao.acao._k} acao={edicao.acao} editavel={editavel} onFechar={() => setEdicao(null)} onSalvar={aplicarAcao} onExcluir={excluirAcao} />
      )}
    </div>
  );
}
