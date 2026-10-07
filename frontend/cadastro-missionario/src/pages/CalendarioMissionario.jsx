import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import LinhaDoTempo from '../components/calendario/LinhaDoTempo';
import TemaModal from '../components/calendario/TemaModal';
import { toast } from '../lib/toast';
import { useAuth, PERFIS } from '../contexts/AuthContext';
import {
  ANO_CALENDARIO, DEPARTAMENTOS, calcularJanela, dia, formatarDia, moeda, origemDaAcao, periodoTema,
} from '../lib/calendario';

const lista = (res) => (Array.isArray(res?.data) ? res.data : []);

const Resumo = ({ rotulo, valor, detalhe, cor }) => (
  <article className="group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" style={{ borderColor: `${cor}30` }}>
    <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: cor }} />
    <p className="pl-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{rotulo}</p>
    <p className="mt-1 break-words pl-2 text-2xl font-bold leading-tight" style={{ color: cor }}>{valor}</p>
    {detalhe && <p className="mt-0.5 pl-2 text-xs text-slate-400">{detalhe}</p>}
  </article>
);

export default function CalendarioMissionario() {
  const { usuario } = useAuth();
  const [temas, setTemas] = useState([]);
  const [permissoes, setPermissoes] = useState({ gerenciarTemas: false, criarAcao: false });
  const [listas, setListas] = useState({ regioes: [], distritos: [], igrejas: [] });
  const [filtro, setFiltro] = useState({ regiaoId: '', distritoId: '', igrejaId: '' });
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(null); // { temaId, destaqueId } | { novo: true }
  const [mes, setMes] = useState(null); // { itens }
  const [criandoModelo, setCriandoModelo] = useState(false);

  const perfil = usuario?.perfil;
  const ehAdmin = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(perfil);
  const ehRegional = [PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL].includes(perfil);

  useEffect(() => {
    Promise.all([api.get('/regioes'), api.get('/distritos'), api.get('/igrejas')])
      .then(([r, d, i]) => setListas({ regioes: lista(r), distritos: lista(d), igrejas: lista(i) }))
      .catch(() => toast.error('Erro ao carregar regiões, distritos e igrejas.'));
  }, []);

  const carregar = useCallback(async () => {
    try {
      const params = { ano: ANO_CALENDARIO };
      Object.entries(filtro).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/calendario-missionario', { params });
      setTemas(res.data.temas || []);
      setPermissoes(res.data.permissoes || { gerenciarTemas: false, criarAcao: false });
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao carregar o calendário missionário.');
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  const meses = useMemo(() => calcularJanela(temas), [temas]);
  const totalAcoes = temas.reduce((s, t) => s + t.acoes.length, 0);
  const totalValor = temas.reduce((s, t) => s + t.acoes.reduce((x, a) => x + Number(a.valor || 0), 0), 0);

  const proximo = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const futuros = temas.filter((t) => t.dataInicio && dia(t.dataInicio) >= hoje).sort((a, b) => dia(a.dataInicio).localeCompare(dia(b.dataInicio)));
    if (!futuros.length) return null;
    const t = futuros[0];
    const dias = Math.ceil((new Date(`${dia(t.dataInicio)}T00:00:00`) - new Date(`${hoje}T00:00:00`)) / 86400000);
    return { t, dias };
  }, [temas]);

  const temaAberto = modal?.temaId ? temas.find((t) => t.id === modal.temaId) : null;

  const mudou = async (temaId) => {
    await carregar();
    setModal(temaId ? { temaId } : null);
  };

  const criarModelo = async () => {
    setCriandoModelo(true);
    try {
      await api.post('/calendario-missionario/temas/modelo', { ano: ANO_CALENDARIO });
      toast.success('Modelo 2027 carregado.');
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao carregar o modelo.');
    } finally {
      setCriandoModelo(false);
    }
  };

  // filtros em cascata
  const regioes = listas.regioes;
  const distritos = listas.distritos.filter((d) => !filtro.regiaoId || String(d.regiaoId) === String(filtro.regiaoId));
  const igrejas = listas.igrejas.filter((i) => !filtro.distritoId
    ? (!filtro.regiaoId || distritos.some((d) => d.id === i.distritoId))
    : String(i.distritoId) === String(filtro.distritoId));
  const mostrarRegiao = (ehAdmin || ehRegional) && regioes.length > 1;
  const mostrarDistrito = listas.distritos.length > 1;
  const mostrarIgreja = listas.igrejas.length > 1;
  const temFiltro = mostrarRegiao || mostrarDistrito || mostrarIgreja;

  const mudarFiltro = (campo, valor) => setFiltro((f) => {
    if (campo === 'regiaoId') return { regiaoId: valor, distritoId: '', igrejaId: '' };
    if (campo === 'distritoId') return { ...f, distritoId: valor, igrejaId: '' };
    return { ...f, [campo]: valor };
  });

  if (carregando) return <LoadingState mensagem="Carregando Calendário Missionário..." />;

  const seletor = (rotulo, campo, opcoes, todos) => (
    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
      {rotulo}
      <select className="input-field mt-1 min-w-[170px]" value={filtro[campo]} onChange={(e) => mudarFiltro(campo, e.target.value)}>
        <option value="">{todos}</option>
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
    </label>
  );

  return (
    <div className="animate-fade-in-up">
      {/* cabecalho */}
      <section className="relative overflow-hidden rounded-2xl border border-[#1A3A6B]/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#C9963A]/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#C9963A]">Planejamento integrado {ANO_CALENDARIO}</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1A3A6B] sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>Calendário Missionário</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-500">Os temas dos eventos são definidos pela Associação. Toque em um tema para ver as ações e cadastrar a sua.</p>
          </div>
          {ehAdmin && (
            <div className="flex flex-wrap gap-2">
              {temas.length === 0 && !filtro.regiaoId && !filtro.distritoId && !filtro.igrejaId && (
                <button type="button" className="btn-outline px-4 py-2 text-sm disabled:opacity-60" disabled={criandoModelo} onClick={criarModelo}>{criandoModelo ? 'Carregando...' : 'Carregar modelo 2027'}</button>
              )}
              <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => setModal({ novo: true })}>+ Novo tema</button>
            </div>
          )}
        </div>

        {temFiltro && (
          <div className="relative mt-5 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <p className="w-full text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:w-auto sm:pb-3">Visualizar</p>
            {mostrarRegiao && seletor('Região', 'regiaoId', regioes, 'Todas as regiões')}
            {mostrarDistrito && seletor('Distrito', 'distritoId', distritos, 'Todos os distritos')}
            {mostrarIgreja && seletor('Igreja', 'igrejaId', igrejas, 'Todas as igrejas')}
            {(filtro.regiaoId || filtro.distritoId || filtro.igrejaId) && (
              <button type="button" className="pb-2.5 text-sm font-bold text-[#C9963A] hover:underline" onClick={() => setFiltro({ regiaoId: '', distritoId: '', igrejaId: '' })}>Limpar filtros</button>
            )}
          </div>
        )}
      </section>

      {/* resumo */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <Resumo rotulo="Próximo evento" valor={proximo ? proximo.t.nome : '—'} detalhe={proximo ? `${proximo.dias === 0 ? 'Hoje' : `em ${proximo.dias} dia(s)`} · ${formatarDia(proximo.t.dataInicio)}` : 'Sem eventos futuros'} cor="#C9963A" />
        </div>
        <Resumo rotulo="Temas" valor={temas.length} cor="#1A3A6B" />
        <Resumo rotulo="Ações" valor={totalAcoes} cor="#0f766e" />
        <Resumo rotulo="Orçamento" valor={moeda(totalValor)} cor="#a21caf" />
      </div>

      {/* linha do tempo */}
      <section className="mt-5 rounded-2xl border border-[#1A3A6B]/10 bg-white p-3 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9963A]">Linha do tempo</p>
            <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Do próximo mês em diante</h2>
          </div>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1.5V4a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V12m0-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1.5a6 6 0 0 1-4.8-2.4L4.4 15a1.6 1.6 0 0 1 2.4-2L8 14.5" /></svg>
            Arraste para navegar pelos meses
          </p>
        </div>

        <LinhaDoTempo temas={temas} meses={meses}
          onAbrir={(temaId, destaqueId) => setModal({ temaId, destaqueId })}
          onAbrirMes={(m, itens) => setMes({ mes: meses[m], itens })} />

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {Object.values(DEPARTAMENTOS).map((d) => (
            <span key={d.label} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.cor }} />{d.label}
            </span>
          ))}
        </div>
      </section>

      {/* lista de temas */}
      <section className="mt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9963A]">Temas dos eventos</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {temas.map((t) => {
            const valor = t.acoes.reduce((s, a) => s + Number(a.valor || 0), 0);
            return (
              <button key={t.id} type="button" onClick={() => setModal({ temaId: t.id })}
                className="group rounded-2xl border border-[#C9963A]/30 bg-gradient-to-br from-white to-[#FFF8E6] p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#C9963A]/70 hover:shadow-xl">
                <p className="text-lg font-bold text-[#1A3A6B] transition group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>{t.nome}</p>
                <p className="mt-0.5 text-sm text-slate-500">{periodoTema(t)}</p>
                <div className="mt-3 flex items-center justify-between text-xs font-bold">
                  <span className="rounded-full bg-[#1A3A6B]/10 px-2.5 py-1 text-[#1A3A6B]">{t.acoes.length} ação(ões)</span>
                  <span className="text-slate-600">{moeda(valor)}</span>
                </div>
              </button>
            );
          })}
          {temas.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400 sm:col-span-2 xl:col-span-3">
              {ehAdmin ? 'Nenhum tema cadastrado. Use “Carregar modelo 2027” ou “+ Novo tema”.' : 'Nenhum tema cadastrado ainda.'}
            </p>
          )}
        </div>
      </section>

      {modal && (modal.novo || temaAberto) && (
        <TemaModal key={modal.novo ? 'novo' : temaAberto.id} tema={modal.novo ? null : temaAberto} destaqueId={modal.destaqueId}
          permissoes={permissoes} usuario={usuario} listas={listas} onFechar={() => setModal(null)} onMudou={mudou} />
      )}

      {mes && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setMes(null)} role="dialog" aria-modal="true">
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Mais ações · {mes.mes.nome}/{mes.mes.ano}</h3>
              <button type="button" className="btn-outline px-3 py-1 text-sm" onClick={() => setMes(null)}>Fechar</button>
            </div>
            <div className="mt-3 space-y-2">
              {mes.itens.map(({ a, t }) => {
                const o = origemDaAcao(a);
                return (
                  <button key={a.id} type="button" className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-[#C9963A]/60 hover:shadow-md"
                    onClick={() => { setMes(null); setModal({ temaId: t.id, destaqueId: a.id }); }}>
                    <span className="block font-bold text-[#1A3A6B]">{a.nome}</span>
                    <span className="text-xs text-slate-500">{o.cargo} · {o.local} → {t.nome} · {moeda(a.valor)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
