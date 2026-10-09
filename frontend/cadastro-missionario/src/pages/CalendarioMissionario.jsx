import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import LinhaDoTempo from '../components/calendario/LinhaDoTempo';
import TemaModal from '../components/calendario/TemaModal';
import EventoModal from '../components/calendario/EventoModal';
import PermissoesCalendarioModal from '../components/calendario/PermissoesCalendarioModal';
import { toast } from '../lib/toast';
import { useAuth, PERFIS } from '../contexts/AuthContext';
import { imprimirCalendarioCompleto } from '../lib/imprimirCalendario';
import {
  ANOS_DISPONIVEIS, DEPARTAMENTOS, calcularJanela, chaveMes, dia, formatarDia, moeda, periodoTema,
} from '../lib/calendario';

const lista = (res) => (Array.isArray(res?.data) ? res.data : []);

const Resumo = ({ rotulo, valor, detalhe, cor, destaque = false }) => (
  <article
    className={`group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
      destaque ? 'ring-2 ring-[#C9963A]/40' : ''
    }`}
    style={{ borderColor: `${cor}35` }}
  >
    <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: cor }} />
    <p className="pl-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{rotulo}</p>
    <p className="mt-1 break-words pl-2 text-2xl font-black leading-tight text-slate-900" style={{ color: cor }}>{valor}</p>
    {detalhe && <p className="mt-1 pl-2 text-xs font-semibold text-slate-500">{detalhe}</p>}
  </article>
);

export default function CalendarioMissionario() {
  const { usuario } = useAuth();
  const linhaDoTempoRef = useRef(null);

  // Estados de ano e ciclo (padrão: Ciclo 2026/2027 começando em Dezembro/2026)
  const [opcaoAnoId, setOpcaoAnoId] = useState('ciclo_2027');
  const [mesFiltro, setMesFiltro] = useState(null); // key numérica do mês ou null

  const opcaoAno = useMemo(
    () => ANOS_DISPONIVEIS.find((a) => a.id === opcaoAnoId) || ANOS_DISPONIVEIS[0],
    [opcaoAnoId]
  );

  const [temas, setTemas] = useState([]);
  const [permissoes, setPermissoes] = useState({ gerenciarTemas: false, gerenciarEventos: false, criarAcao: false });
  const [listas, setListas] = useState({ regioes: [], distritos: [], igrejas: [] });
  const [filtro, setFiltro] = useState({ regiaoId: '', distritoId: '', igrejaId: '' });
  const [departamentoFiltro, setDepartamentoFiltro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroAcesso, setErroAcesso] = useState('');

  // Modais
  const [modalTema, setModalTema] = useState(null); // { temaId } | { novo: true } | null
  const [modalEvento, setModalEvento] = useState(null); // { evento, tema, destaqueAcaoId } | null
  const [modalPermissoes, setModalPermissoes] = useState(false);
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
    setErroAcesso('');
    try {
      const params = { ano: opcaoAno.ano };
      Object.entries(filtro).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/calendario-missionario', { params });
      setTemas(res.data.temas || []);
      setPermissoes(res.data.permissoes || { gerenciarTemas: false, gerenciarEventos: false, criarAcao: false });
    } catch (err) {
      const mensagem = err.response?.data?.erro || 'Erro ao carregar o calendário missionário.';
      if (err.response?.status === 403) setErroAcesso(mensagem);
      else toast.error(mensagem);
    } finally {
      setCarregando(false);
    }
  }, [opcaoAno.ano, filtro]);

  useEffect(() => { carregar(); }, [carregar]);

  // Meses calculados da linha do tempo: 13 meses no ciclo oficial (Dez/2026 a Dez/2027)
  const meses = useMemo(
    () => calcularJanela(opcaoAno.ano, opcaoAno.modo),
    [opcaoAno.ano, opcaoAno.modo]
  );

  // Contagem de ações e orçamento
  const todosEventos = useMemo(() => {
    const list = [];
    temas.forEach((t) => {
      (t.eventos || []).forEach((ev) => list.push({ ...ev, tema: t }));
    });
    return list;
  }, [temas]);

  const totalAcoes = useMemo(() => {
    let count = 0;
    temas.forEach((t) => {
      count += (t.acoes || []).length;
      (t.eventos || []).forEach((ev) => {
        count += (ev.acoes || []).length;
      });
    });
    return count;
  }, [temas]);

  const totalValor = useMemo(() => {
    let soma = 0;
    temas.forEach((t) => {
      soma += (t.acoes || []).reduce((acc, a) => acc + Number(a.valor || 0), 0);
      (t.eventos || []).forEach((ev) => {
        soma += (ev.acoes || []).reduce((acc, a) => acc + Number(a.valor || 0), 0);
      });
    });
    return soma;
  }, [temas]);

  // Próximo evento futuro a partir de hoje
  const proximo = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const futuros = temas
      .filter((t) => t.dataInicio && dia(t.dataInicio) >= hoje)
      .sort((a, b) => dia(a.dataInicio).localeCompare(dia(b.dataInicio)));
    if (!futuros.length) return null;
    const t = futuros[0];
    const dias = Math.ceil((new Date(`${dia(t.dataInicio)}T00:00:00`) - new Date(`${hoje}T00:00:00`)) / 86400000);
    const qtdEv = (t.eventos || []).length;
    return { t, dias, qtdEv };
  }, [temas]);

  // Estatísticas por mês para a régua rápida e botões de mês
  const estatisticasMeses = useMemo(() => {
    if (!meses.length) return [];
    return meses.map((m) => {
      let qtdEventos = 0;
      let qtdAcoes = 0;
      let orcamento = 0;

      temas.forEach((t) => {
        if (t.dataInicio && chaveMes(t.dataInicio) === m.key) qtdEventos += 1;
        (t.eventos || []).forEach((ev) => {
          if (ev.data && chaveMes(ev.data) === m.key) {
            qtdEventos += 1;
            qtdAcoes += (ev.acoes || []).length;
            orcamento += (ev.acoes || []).reduce((acc, a) => acc + Number(a.valor || 0), 0);
          }
        });
      });

      return { ...m, qtdEventos, qtdAcoes, orcamento };
    });
  }, [meses, temas]);

  // Dados do mês selecionado quando o filtro de mês está ativo
  const infoMesAtivo = useMemo(() => {
    if (mesFiltro === null) return null;
    return estatisticasMeses.find((m) => m.key === mesFiltro) || null;
  }, [mesFiltro, estatisticasMeses]);

  // Temas filtrados pelo mês caso o usuário queira foco no mês
  const temasExibidos = useMemo(() => {
    if (mesFiltro === null) return temas;
    return temas.filter((t) => {
      const temaNoMes = t.dataInicio && chaveMes(t.dataInicio) === mesFiltro;
      const eventoNoMes = (t.eventos || []).some((ev) => ev.data && chaveMes(ev.data) === mesFiltro);
      return temaNoMes || eventoNoMes;
    });
  }, [temas, mesFiltro]);

  const temaAberto = modalTema?.temaId ? temas.find((t) => t.id === modalTema.temaId) : null;

  const aoAtualizarDados = async (temaIdAtualizado) => {
    await carregar();
    if (modalTema && temaIdAtualizado) {
      setModalTema({ temaId: temaIdAtualizado });
    }
    if (modalEvento) {
      // Atualizar o objeto do evento aberto
      const evAtualizado = todosEventos.find((x) => x.id === modalEvento.evento.id);
      if (evAtualizado) {
        setModalEvento((prev) => ({ ...prev, evento: evAtualizado }));
      }
    }
  };

  const criarModelo = async () => {
    setCriandoModelo(true);
    try {
      await api.post('/calendario-missionario/temas/modelo', { ano: opcaoAno.ano });
      toast.success(`Modelo ${opcaoAno.ano} carregado com sucesso!`);
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao carregar o modelo.');
    } finally {
      setCriandoModelo(false);
    }
  };

  const imprimir = () => {
    const abriu = imprimirCalendarioCompleto({
      opcaoAno,
      meses,
      temas,
      filtro,
      listas,
      totalAcoes,
      totalValor,
    });
    if (!abriu) toast.error('O navegador bloqueou a janela de impressão. Autorize pop-ups e tente novamente.');
  };

  // Selecionar mês e navegar até ele na linha do tempo
  const selecionarMes = (m) => {
    if (m === null || mesFiltro === m.key) {
      setMesFiltro(null);
    } else {
      setMesFiltro(m.key);
      linhaDoTempoRef.current?.rolarParaMes(m.indice);
    }
  };

  // Abrir evento selecionado
  const abrirEvento = (ev, tema) => {
    const temaPai = tema || temas.find((t) => t.id === ev.temaId);
    setModalEvento({ evento: ev, tema: temaPai });
  };

  // Abrir tema selecionado
  const abrirTema = (t) => {
    setModalTema({ temaId: t.id });
  };

  // Mudar ano selecionado
  const mudarOpcaoAno = (id) => {
    setOpcaoAnoId(id);
    setMesFiltro(null);
  };

  // Filtros em cascata
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

  if (erroAcesso) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-700">!</div>
        <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.2em] text-[#C9963A]">Acesso ao calendário</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Visualização não liberada</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-500">{erroAcesso}</p>
        <p className="mt-2 text-xs text-slate-400">Um administrador pode liberar este acesso para sua região ou distrito.</p>
      </section>
    );
  }

  const seletor = (rotulo, campo, opcoes, todos) => (
    <label key={campo} className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
      {rotulo}
      <select
        className="input-field mt-1 min-w-[170px]"
        value={filtro[campo]}
        onChange={(e) => mudarFiltro(campo, e.target.value)}
      >
        <option value="">{todos}</option>
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
    </label>
  );

  return (
    <div className="animate-fade-in-up space-y-5 print:p-0 print:m-0">
      {/* Cabeçalho Superior com Controles de Ano e Ações */}
      <section className="relative overflow-hidden rounded-2xl border border-[#1A3A6B]/10 bg-white p-5 shadow-sm sm:p-6 print:border-none print:shadow-none">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#C9963A]/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#C9963A]" />
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#C9963A]">
                Planejamento Integrado · {opcaoAno.rotulo}
              </p>
              <span className="rounded-full bg-[#1A3A6B]/10 px-2.5 py-0.5 text-[10px] font-black text-[#1A3A6B]">
                Início com Ações ASA em Dezembro de 2026
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold text-[#1A3A6B] sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
              Calendário Missionário
            </h1>
            <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
              Temas oficiais na linha do tempo com eventos preparatórios que apontam para o tema. Clique em cada evento para cadastrar ações e planejamento da sua igreja.
            </p>
          </div>

          {/* Botões de Ação no Topo */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            {ehAdmin && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1A3A6B]/20 bg-[#1A3A6B]/5 px-3.5 py-2 text-xs font-bold text-[#1A3A6B] transition hover:border-[#1A3A6B]/40 hover:bg-[#1A3A6B]/10"
                onClick={() => setModalPermissoes(true)}
                title="Definir quem pode visualizar e editar o calendário"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                  <path d="M4.5 17a5.5 5.5 0 0 1 11 0M15.5 8.5h3M17 7v3" />
                </svg>
                Permissões
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#1A3A6B] hover:text-[#1A3A6B]"
              onClick={imprimir}
              title="Imprimir ou salvar PDF do calendário"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 7V3h10v4M5 14H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2M5 11h10v6H5v-6z" />
              </svg>
              Imprimir / PDF
            </button>

            {ehAdmin && temas.length === 0 && !filtro.regiaoId && !filtro.distritoId && !filtro.igrejaId && (
              <button
                type="button"
                className="btn-outline px-4 py-2 text-xs font-bold disabled:opacity-60"
                disabled={criandoModelo}
                onClick={criarModelo}
              >
                {criandoModelo ? 'Carregando...' : `Carregar Modelo ${opcaoAno.ano}`}
              </button>
            )}

            {permissoes.criarTema && (
              <button
                type="button"
                className="btn-primary px-4 py-2 text-xs font-bold"
                onClick={() => setModalTema({ novo: true })}
              >
                + Novo Tema
              </button>
            )}
          </div>
        </div>

        {/* Barra de Seleção de ANO */}
        <div className="mt-5 border-t border-slate-100 pt-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1A3A6B] mr-1">
                Ano do Calendário:
              </span>
              {ANOS_DISPONIVEIS.map((op) => {
                const ativo = opcaoAnoId === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => mudarOpcaoAno(op.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                      ativo
                        ? 'border border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-md'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <span>{op.rotulo}</span>
                    {ativo && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#E3B965]" />
                    )}
                  </button>
                );
              })}
            </div>

            <span className="text-xs font-medium text-slate-400">
              Mostrando {meses.length} meses ({meses[0]?.nome}/{meses[0]?.ano} a {meses[meses.length - 1]?.nome}/{meses[meses.length - 1]?.ano})
            </span>
          </div>
        </div>

        {/* Filtros em cascata (Região, Distrito, Igreja) */}
        {temFiltro && (
          <div className="relative mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4 print:hidden">
            <p className="w-full text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-400 sm:w-auto sm:pb-3">
              Filtrar Escopo:
            </p>
            {mostrarRegiao && seletor('Região', 'regiaoId', regioes, 'Todas as regiões')}
            {mostrarDistrito && seletor('Distrito', 'distritoId', distritos, 'Todos os distritos')}
            {mostrarIgreja && seletor('Igreja', 'igrejaId', igrejas, 'Todas as igrejas')}
            {(filtro.regiaoId || filtro.distritoId || filtro.igrejaId) && (
              <button
                type="button"
                className="pb-2.5 text-xs font-extrabold text-[#C9963A] hover:underline"
                onClick={() => setFiltro({ regiaoId: '', distritoId: '', igrejaId: '' })}
              >
                Limpar filtros de escopo
              </button>
            )}
          </div>
        )}
      </section>

      {/* Cards de Resumo Executivo */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="col-span-2 lg:col-span-1">
          <Resumo
            rotulo="Próximo Tema Central"
            valor={proximo ? proximo.t.nome : '—'}
            detalhe={
              proximo
                ? `${proximo.dias === 0 ? '🚨 Hoje!' : proximo.dias <= 30 ? `⚠️ Em ${proximo.dias} dias` : `Em ${proximo.dias} dias`} · ${formatarDia(proximo.t.dataInicio)} (${proximo.qtdEv} eventos preparatórios)`
                : 'Nenhum tema agendado'
            }
            cor="#C9963A"
            destaque={Boolean(proximo && proximo.dias <= 30)}
          />
        </div>
        <Resumo rotulo="Temas Oficiais" valor={temas.length} detalhe="Definidos pela liderança" cor="#1A3A6B" />
        <Resumo
          rotulo={infoMesAtivo ? `Ações (${infoMesAtivo.nome}/${infoMesAtivo.ano})` : 'Ações Planejadas'}
          valor={infoMesAtivo ? infoMesAtivo.qtdAcoes : totalAcoes}
          detalhe={infoMesAtivo ? `${totalAcoes} ações no ano todo` : 'Nos departamentos e igrejas'}
          cor="#0f766e"
        />
        <Resumo
          rotulo={infoMesAtivo ? `Orçamento (${infoMesAtivo.nome}/${infoMesAtivo.ano})` : 'Orçamento Total'}
          valor={moeda(infoMesAtivo ? infoMesAtivo.orcamento : totalValor)}
          detalhe={infoMesAtivo ? `${moeda(totalValor)} no ano todo` : 'Investimento previsto'}
          cor="#a21caf"
        />
      </div>

      {/* Régua de Navegação e Filtro por MÊS (com demarcação 2026 ➔ 2027) */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm print:hidden">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#1A3A6B]" />
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#1A3A6B]">
              Seletor de Mês e Sequência do Calendário
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {mesFiltro !== null && (
              <button
                type="button"
                onClick={() => selecionarMes(null)}
                className="font-extrabold text-[#C9963A] hover:underline"
              >
                ✕ Limpar seleção de mês (ver todos)
              </button>
            )}
            <span className="font-semibold text-slate-400">Toque para selecionar e rolar</span>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {/* Botão "Todos os Meses" */}
          <button
            type="button"
            onClick={() => selecionarMes(null)}
            className={`group flex min-w-[84px] shrink-0 flex-col items-center justify-center rounded-xl border p-2 text-center transition-all duration-200 ${
              mesFiltro === null
                ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-md'
                : 'border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span className="text-xs font-black uppercase tracking-wider">Todos</span>
            <span className={`text-[10px] font-bold ${mesFiltro === null ? 'text-[#E3B965]' : 'text-slate-400'}`}>
              Geral
            </span>
            <div className="mt-1 flex items-center gap-1">
              <span className={`text-[9.5px] font-extrabold ${mesFiltro === null ? 'text-white/80' : 'text-slate-400'}`}>
                {todosEventos.length} eventos
              </span>
            </div>
          </button>

          {/* Botões individuais de cada mês do ciclo com a virada de ano */}
          {estatisticasMeses.map((m) => {
            const temAtividades = m.qtdEventos > 0 || m.qtdAcoes > 0;
            const selecionado = mesFiltro === m.key;

            return (
              <div key={m.key} className="flex shrink-0 items-center gap-1.5">
                {/* Demarcação visual da virada de ano */}
                {m.viradaAno && (
                  <div className="flex flex-col items-center justify-center px-1">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#C9963A]/40 bg-gradient-to-r from-[#1A3A6B] to-[#13294d] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-[#E3B965] shadow-sm">
                      <span>{m.anoAnterior}</span>
                      <span className="text-white">➔</span>
                      <span className="text-white">{m.ano}</span>
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => selecionarMes(m)}
                  className={`group flex min-w-[78px] flex-col items-center justify-center rounded-xl border p-2 text-center transition-all duration-200 ${
                    selecionado
                      ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-md scale-105 ring-2 ring-[#C9963A]'
                      : temAtividades
                      ? 'border-[#C9963A]/50 bg-[#FFFDF7] text-slate-800 hover:border-[#C9963A] hover:shadow-sm'
                      : 'border-slate-100 bg-slate-50/60 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-wider">{m.nome}</span>
                  <span className={`text-[10px] font-bold ${selecionado ? 'text-[#E3B965]' : 'text-slate-400'}`}>
                    {m.ano}
                  </span>

                  <div className="mt-1 flex items-center gap-1">
                    {m.qtdEventos > 0 && (
                      <span
                        title={`${m.qtdEventos} evento(s)`}
                        className={`h-2 w-2 rounded-full ${selecionado ? 'bg-[#E3B965]' : 'bg-[#C9963A]'}`}
                      />
                    )}
                    {m.qtdAcoes > 0 && (
                      <span
                        title={`${m.qtdAcoes} ação(ões)`}
                        className={`h-2 w-2 rounded-full ${selecionado ? 'bg-emerald-300' : 'bg-emerald-600'}`}
                      />
                    )}
                    {!temAtividades && (
                      <span className="text-[9px] text-slate-300">—</span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Linha do Tempo Gráfica Principal com Temas, Eventos e Setas */}
      <section className="rounded-2xl border border-[#1A3A6B]/10 bg-white p-3 shadow-sm sm:p-5">
        <div className="mb-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#C9963A]" />
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#C9963A]">
                Linha do Tempo Integrada
              </p>
            </div>
            <h2 className="mt-0.5 text-xl font-black text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Temas e Eventos Preparatórios ({meses[0]?.nome} {meses[0]?.ano} a {meses[meses.length - 1]?.nome} {meses[meses.length - 1]?.ano})
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#C9963A]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12m0-1.5V4a1.5 1.5 0 0 1 3 0v7m0-5.5a1.5 1.5 0 0 1 3 0V12m0-3a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1.5a6 6 0 0 1-4.8-2.4L4.4 15a1.6 1.6 0 0 1 2.4-2L8 14.5" />
            </svg>
            <span>Arraste com a mãozinha ou use as setas</span>
          </div>
        </div>

        {/* Componente LinhaDoTempo */}
        <LinhaDoTempo
          ref={linhaDoTempoRef}
          temas={temas}
          meses={meses}
          departamentoFiltro={departamentoFiltro}
          mesFiltro={mesFiltro}
          onAbrirTema={abrirTema}
          onAbrirEvento={abrirEvento}
        />

        {/* Legenda Interativa por Departamentos (Filtro Rápido) */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Filtrar por Departamento:
          </span>

          <button
            type="button"
            onClick={() => setDepartamentoFiltro(null)}
            className={`rounded-full px-2.5 py-1 text-xs font-extrabold transition ${
              departamentoFiltro === null
                ? 'bg-[#1A3A6B] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>

          {Object.entries(DEPARTAMENTOS).map(([chave, d]) => {
            const ativo = departamentoFiltro === chave;
            return (
              <button
                key={chave}
                type="button"
                onClick={() => setDepartamentoFiltro(ativo ? null : chave)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold transition ${
                  ativo
                    ? 'text-white shadow-md ring-2 ring-offset-1'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
                style={{
                  backgroundColor: ativo ? d.cor : undefined,
                  boxShadow: ativo ? `0 4px 14px -3px ${d.cor}99` : undefined,
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: ativo ? '#ffffff' : d.cor }}
                />
                {d.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Lista e Cards de Temas Oficiais com Possibilidade de Adicionar Mais Temas */}
      <section className="mt-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#C9963A]" />
            <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#C9963A]">
              Detalhamento dos Temas Oficiais
            </h3>
            {infoMesAtivo && (
              <span className="rounded-full bg-[#C9963A]/15 px-2.5 py-0.5 text-[10px] font-black text-[#9A6F1F]">
                Focando: {infoMesAtivo.nomeCompleto} de {infoMesAtivo.ano}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {mesFiltro !== null && (
              <button
                type="button"
                onClick={() => selecionarMes(null)}
                className="text-xs font-bold text-[#1A3A6B] hover:underline"
              >
                Ver todos os temas
              </button>
            )}

            {ehAdmin && (
              <button
                type="button"
                className="btn-primary px-3 py-1.5 text-xs font-bold shadow-sm"
                onClick={() => setModalTema({ novo: true })}
              >
                + Adicionar Mais Temas
              </button>
            )}

            <span className="text-xs font-bold text-slate-400">{temasExibidos.length} tema(s)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {temasExibidos.map((t) => {
            const eventos = t.eventos || [];
            const valorTotal = eventos.reduce((s, ev) => s + (ev.orcamentoTotal || 0), 0);
            const totalAcoesTema = eventos.reduce((s, ev) => s + (ev.totalAcoes || 0), 0);

            return (
              <div
                key={t.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#C9963A]/30 bg-gradient-to-br from-white via-white to-[#FFF9ED] p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9963A]/70 hover:shadow-xl"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => abrirTema(t)}
                      className="text-lg font-black text-[#1A3A6B] text-left hover:text-[#9A6F1F] transition-colors"
                      style={{ fontFamily: 'Georgia, serif' }}
                    >
                      {t.nome}
                    </button>
                    <span className="rounded-full bg-[#1A3A6B]/10 px-2 py-0.5 text-[10px] font-black text-[#1A3A6B]">
                      {periodoTema(t)}
                    </span>
                  </div>

                  {t.descricao && (
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-500">
                      {t.descricao}
                    </p>
                  )}

                  {/* Lista de Eventos Preparatórios vinculados a este tema */}
                  <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Eventos Preparatórios ({eventos.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {eventos.map((ev) => {
                        const depto = DEPARTAMENTOS[ev.departamento] || DEPARTAMENTOS.OUTRO;
                        return (
                          <button
                            key={ev.id}
                            type="button"
                            onClick={() => abrirEvento(ev, t)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:border-[#C9963A] hover:bg-[#FFFDF7] transition"
                            title={`Clique para abrir ações de ${ev.nome}`}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: depto.cor }} />
                            <span>{ev.nome}</span>
                            <span className="text-[10px] font-normal text-slate-400">
                              ({ev.totalAcoes || 0})
                            </span>
                          </button>
                        );
                      })}
                      {eventos.length === 0 && (
                        <span className="text-xs text-slate-400 italic">Nenhum evento vinculado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumo do Tema no rodapé do card */}
                <div className="mt-4 pt-3 border-t border-slate-100/90 w-full flex items-center justify-between text-xs font-bold">
                  <div>
                    <span className="text-slate-500">{totalAcoesTema} ações planejadas</span>
                    <p className="font-extrabold text-[#1A3A6B]">{moeda(valorTotal)}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => abrirTema(t)}
                    className="font-extrabold text-[#C9963A] hover:underline"
                  >
                    Gerenciar Tema →
                  </button>
                </div>
              </div>
            );
          })}

          {temasExibidos.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400 sm:col-span-2 xl:col-span-3">
              {mesFiltro !== null
                ? `Nenhuma atividade agendada para ${infoMesAtivo?.nomeCompleto || 'o mês selecionado'}.`
                : ehAdmin
                ? `Nenhum tema cadastrado para ${opcaoAno.rotulo}. Use o botão "+ Adicionar Mais Temas".`
                : 'Nenhum tema oficial cadastrado pela liderança ainda.'}
            </p>
          )}
        </div>
      </section>

      {/* Modal Principal do Tema (Centralizado) */}
      {modalTema && createPortal(
        <TemaModal
          key={modalTema.novo ? 'novo' : temaAberto?.id}
          tema={modalTema.novo ? null : temaAberto}
          permissoes={permissoes}
          usuario={usuario}
          onFechar={() => setModalTema(null)}
          onMudou={aoAtualizarDados}
          onAbrirEvento={(ev, t) => {
            setModalTema(null);
            abrirEvento(ev, t);
          }}
        />,
        document.body
      )}

      {/* Modal do Evento e suas Ações (Perfeitamente Centralizado) */}
      {modalEvento && createPortal(
        <EventoModal
          key={modalEvento.evento.id}
          evento={modalEvento.evento}
          tema={modalEvento.tema}
          destaqueAcaoId={modalEvento.destaqueAcaoId}
          permissoes={permissoes}
          usuario={usuario}
          listas={listas}
          onFechar={() => setModalEvento(null)}
          onMudou={aoAtualizarDados}
        />,
        document.body
      )}

      {modalPermissoes && createPortal(
        <PermissoesCalendarioModal listas={listas} onFechar={() => setModalPermissoes(false)} />,
        document.body
      )}
    </div>
  );
}
