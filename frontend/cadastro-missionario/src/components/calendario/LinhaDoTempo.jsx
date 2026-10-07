import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import {
  chaveMes, DEPARTAMENTOS, formatarDiaCurto, moeda, periodoTema,
} from '../../lib/calendario';

const ALT_CABECALHO = 64;
const Y_LINHA_TEMPO = ALT_CABECALHO + 14;
const ALT_LINHA_TEMPO = 34;
const Y_TEMAS = Y_LINHA_TEMPO + ALT_LINHA_TEMPO + 8;
const ALT_TEMA = 62;
const Y_EVENTOS = Y_TEMAS + ALT_TEMA + 110; // espaço amplo para as setas diagonais curvas subirem
const ALT_EVENTO = 80;

const IconeSeta = ({ lado }) => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={lado === 'esq' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'} />
  </svg>
);

const LinhaDoTempo = forwardRef(function LinhaDoTempo({
  temas,
  meses,
  departamentoFiltro,
  mesFiltro = null,
  onAbrirTema,
  onAbrirEvento,
}, ref) {
  const rolagemRef = useRef(null);
  const arrasto = useRef({ ativo: false, x: 0, esquerda: 0, moveu: false });
  const [largura, setLargura] = useState(1000);
  const [arrastando, setArrastando] = useState(false);
  const [destaqueTema, setDestaqueTema] = useState(null);
  const [destaqueEvento, setDestaqueEvento] = useState(null);
  const [limites, setLimites] = useState({ inicio: true, fim: false });

  const qtdMeses = meses.length || 13;

  const larguraMes = useMemo(() => {
    const visiveis = largura >= 1100 ? 5.6 : largura >= 720 ? 3.6 : 2.2;
    return Math.max(145, Math.floor(largura / visiveis));
  }, [largura]);

  const rolarParaMes = useCallback((indiceMes) => {
    const el = rolagemRef.current;
    if (!el || indiceMes < 0 || indiceMes >= qtdMeses) return;
    const deslocamento = Math.max(0, indiceMes * larguraMes - (el.clientWidth - larguraMes) / 2);
    el.scrollTo({ left: deslocamento, behavior: 'smooth' });
  }, [larguraMes, qtdMeses]);

  useImperativeHandle(ref, () => ({
    rolarParaMes,
  }), [rolarParaMes]);

  const atualizarLimites = useCallback(() => {
    const el = rolagemRef.current;
    if (!el) return;
    setLimites({ inicio: el.scrollLeft < 8, fim: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    const el = rolagemRef.current;
    if (!el) return undefined;
    const observador = new ResizeObserver(() => { setLargura(el.clientWidth); atualizarLimites(); });
    observador.observe(el);
    setLargura(el.clientWidth);
    return () => observador.disconnect();
  }, [atualizarLimites]);

  // Arrastar com a mãozinha (mouse drag)
  useEffect(() => {
    const mover = (e) => {
      const a = arrasto.current;
      if (!a.ativo) return;
      const delta = e.clientX - a.x;
      if (Math.abs(delta) > 5) a.moveu = true;
      if (rolagemRef.current) {
        rolagemRef.current.scrollLeft = a.esquerda - delta;
      }
    };
    const soltar = () => {
      if (!arrasto.current.ativo) return;
      arrasto.current.ativo = false;
      setArrastando(false);
      setTimeout(() => { arrasto.current.moveu = false; }, 0);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
    return () => {
      window.removeEventListener('mousemove', mover);
      window.removeEventListener('mouseup', soltar);
    };
  }, []);

  const iniciarArrasto = (e) => {
    if (e.button !== 0) return;
    arrasto.current = { ativo: true, x: e.clientX, esquerda: rolagemRef.current.scrollLeft, moveu: false };
    setArrastando(true);
  };

  const bloquearCliqueAposArrasto = (e) => {
    if (arrasto.current.moveu) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const rolar = (sentido) => rolagemRef.current?.scrollBy({ left: sentido * larguraMes * 3, behavior: 'smooth' });

  const inicioJanela = meses[0]?.key ?? 0;
  const posicao = (data) => (data ? chaveMes(data) - inicioJanela : -1);

  // Mapear temas e eventos nas colunas
  const layout = useMemo(() => {
    // 1. Temas centrais
    const temasVisiveis = temas
      .map((t) => ({ t, m: posicao(t.dataInicio) }))
      .filter(({ m }) => m >= 0 && m < qtdMeses);

    const posTema = new Map(temasVisiveis.map((p) => [p.t.id, p]));

    // 2. Eventos preparatórios (podem ser t.eventos ou inferidos de t.acoes)
    const ocupacaoPorMes = Array(qtdMeses).fill(0);
    const todosEventos = [];

    temas.forEach((t) => {
      // Se o tema tem eventos cadastrados
      const listaEv = t.eventos && t.eventos.length > 0 ? t.eventos : [];

      listaEv.forEach((ev) => {
        const m = posicao(ev.data || t.dataInicio);
        if (m >= 0 && m < qtdMeses) {
          const linha = ocupacaoPorMes[m];
          ocupacaoPorMes[m] += 1;
          todosEventos.push({ ev, t, m, linha });
        }
      });
    });

    const maxLinhasEvento = Math.max(1, ...ocupacaoPorMes);
    const alturaTotal = Y_EVENTOS + maxLinhasEvento * (ALT_EVENTO + 16) + 40;

    return { temasVisiveis, posTema, todosEventos, maxLinhasEvento, alturaTotal };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temas, inicioJanela, qtdMeses]);

  const totalLargura = larguraMes * qtdMeses;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_45px_-18px_rgba(26,58,107,0.32)]">
      {/* Botões de navegação lateral rápida */}
      <button
        type="button"
        onClick={() => rolar(-1)}
        disabled={limites.inicio}
        aria-label="Meses anteriores"
        className="absolute left-2.5 top-[110px] z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-[#1A3A6B] shadow-xl backdrop-blur transition hover:scale-110 hover:bg-[#1A3A6B] hover:text-white disabled:pointer-events-none disabled:opacity-0 active:scale-95"
      >
        <IconeSeta lado="esq" />
      </button>

      <button
        type="button"
        onClick={() => rolar(1)}
        disabled={limites.fim}
        aria-label="Próximos meses"
        className="absolute right-2.5 top-[110px] z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-[#1A3A6B] shadow-xl backdrop-blur transition hover:scale-110 hover:bg-[#1A3A6B] hover:text-white disabled:pointer-events-none disabled:opacity-0 active:scale-95"
      >
        <IconeSeta lado="dir" />
      </button>

      {/* Sombras suaves nas bordas de rolagem */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-white/95 to-transparent transition-opacity duration-300 ${limites.inicio ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-white/95 to-transparent transition-opacity duration-300 ${limites.fim ? 'opacity-0' : 'opacity-100'}`} />

      {/* Contêiner com rolagem e mãozinha */}
      <div
        ref={rolagemRef}
        onScroll={atualizarLimites}
        onMouseDown={iniciarArrasto}
        onClickCapture={bloquearCliqueAposArrasto}
        className={`overflow-x-auto overflow-y-hidden ${arrastando ? 'cursor-grabbing select-none' : 'cursor-grab'} [scrollbar-width:thin] transition-colors`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="relative" style={{ width: totalLargura, height: layout.alturaTotal }}>
          {/* Definições de Marcadores de Setas SVG */}
          <svg className="absolute pointer-events-none" width="0" height="0">
            <defs>
              <marker id="seta-tema-padrao" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1A3A6B" />
              </marker>
              <marker id="seta-tema-ouro" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7.5" markerHeight="7.5" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#C9963A" />
              </marker>
            </defs>
          </svg>

          {/* Colunas dos meses no grid */}
          <div className="absolute inset-0 flex">
            {meses.map((m, i) => {
              const ativo = mesFiltro === m.key;
              return (
                <div
                  key={m.key}
                  className={`relative h-full border-r border-slate-200/70 transition-colors ${
                    m.viradaAno ? 'border-l-[3px] border-l-[#C9963A]' : ''
                  } ${
                    ativo
                      ? 'bg-amber-50/60 ring-2 ring-inset ring-[#C9963A]/50'
                      : i % 2
                      ? 'bg-slate-50/50'
                      : 'bg-white'
                  }`}
                  style={{ width: larguraMes }}
                >
                  {m.viradaAno && (
                    <div className="pointer-events-none absolute left-2 top-[74px] z-10 inline-flex items-center gap-1 rounded-full bg-[#C9963A]/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#9A6F1F] shadow-xs">
                      <span>Novo Ano</span>
                      <strong className="text-[#1A3A6B]">{m.ano}</strong>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cabeçalho elegante dos meses com transição de ano */}
          <div className="absolute inset-x-0 top-0 flex bg-gradient-to-b from-[#1A3A6B] via-[#16335e] to-[#112749]" style={{ height: ALT_CABECALHO }}>
            {meses.map((m, i) => {
              const ativo = mesFiltro === m.key;
              return (
                <div
                  key={m.key}
                  className={`relative flex flex-col items-center justify-center border-r transition-colors ${
                    m.viradaAno ? 'border-l-[3px] border-l-[#E3B965] bg-white/10' : 'border-white/10'
                  } ${ativo ? 'bg-[#C9963A]/30' : ''}`}
                  style={{ width: larguraMes }}
                >
                  {/* Marcador em destaque da Virada de Ano */}
                  {m.viradaAno && (
                    <div className="pointer-events-none absolute -top-2.5 left-0 z-30 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-gradient-to-r from-[#C9963A] via-[#E3B965] to-[#C9963A] px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-[#1A3A6B] shadow-md ring-2 ring-[#C9963A]/40">
                        <span>{m.anoAnterior}</span>
                        <span className="text-white">➔</span>
                        <span className="text-white drop-shadow-sm">{m.ano}</span>
                      </span>
                    </div>
                  )}

                  <span className="text-sm font-extrabold uppercase tracking-[0.24em] text-white drop-shadow-sm">
                    {m.nome}
                  </span>
                  <span className={`mt-0.5 text-[11px] font-bold tracking-widest ${m.viradaAno ? 'text-[#FFF2C2] font-black' : 'text-[#E3B965]'}`}>
                    {m.ano}
                  </span>

                  {i === 0 && (
                    <span className="absolute -bottom-px left-1/2 h-[3.5px] w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#C9963A] to-[#F7D488] shadow-sm" />
                  )}
                  {ativo && (
                    <span className="absolute bottom-0 inset-x-0 h-[3.5px] bg-[#E3B965] shadow-md" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Faixa Horizontal Dourada "LINHA DO TEMPO" (Padrão da Planilha) */}
          <div
            className="absolute inset-x-0 flex items-center justify-center shadow-xs"
            style={{
              top: Y_LINHA_TEMPO,
              height: ALT_LINHA_TEMPO,
              background: 'linear-gradient(90deg, #b4852f 0%, #C9963A 15%, #E3B965 50%, #C9963A 85%, #b4852f 100%)',
            }}
          >
            <span className="text-[11px] font-black uppercase tracking-[0.35em] text-[#1A3A6B] drop-shadow-xs select-none">
              LINHA DO TEMPO · PLANEJAMENTO INTEGRADO
            </span>
          </div>

          {/* Rótulo das Atividades e Eventos Preparatórios */}
          <div className="absolute left-3 flex items-center gap-1.5" style={{ top: Y_EVENTOS - 26 }}>
            <span className="h-2 w-2 rounded-full bg-[#1A3A6B]" />
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-[#1A3A6B]">
              Eventos Preparatórios dos Departamentos (Clique para abrir ações e planejamento)
            </p>
          </div>

          {/* SETAS DIRECIONAIS SVG (Apontam do Evento subindo até o Tema de destino) */}
          <svg className="pointer-events-none absolute left-0 top-0" width={totalLargura} height={layout.alturaTotal} aria-hidden="true">
            {layout.todosEventos.map(({ ev, t, m, linha }) => {
              const evTema = layout.posTema.get(t.id);
              if (!evTema) return null;

              // Ponto de partida: topo central do card do evento
              const x1 = m * larguraMes + larguraMes / 2;
              const y1 = Y_EVENTOS + linha * (ALT_EVENTO + 16);

              // Ponto de chegada: base central do card do tema na Linha do Tempo
              const x2 = evTema.m * larguraMes + larguraMes / 2;
              const y2 = Y_TEMAS + ALT_TEMA;

              // Curvatura Bezier
              const dy = y1 - y2;
              const c1Y = y1 - dy * 0.45;
              const c2Y = y2 + dy * 0.35;

              const ehDestaque = destaqueEvento === ev.id || destaqueTema === t.id;
              const depto = DEPARTAMENTOS[ev.departamento] || DEPARTAMENTOS.OUTRO;
              const corSeta = ehDestaque ? '#C9963A' : depto.cor;

              return (
                <g key={`seta-${ev.id}`} className="transition-all duration-300" opacity={ehDestaque ? 1 : 0.65}>
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${c1Y}, ${x2} ${c2Y}, ${x2} ${y2 + 4}`}
                    fill="none"
                    stroke={corSeta}
                    strokeWidth={ehDestaque ? 3.2 : 2.2}
                    strokeDasharray={ehDestaque ? undefined : '5,3'}
                    markerEnd={ehDestaque ? 'url(#seta-tema-ouro)' : 'url(#seta-tema-padrao)'}
                  />
                  <circle cx={x1} cy={y1} r={ehDestaque ? 4.5 : 3.5} fill={corSeta} />
                </g>
              );
            })}
          </svg>

          {/* BLOCOS DOS TEMAS CENTRAIS (Na Linha do Tempo) */}
          {layout.temasVisiveis.map(({ t, m }) => {
            const ehDestaque = destaqueTema === t.id;
            const totalEventos = t.eventos?.length || 0;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onAbrirTema(t)}
                onMouseEnter={() => setDestaqueTema(t.id)}
                onMouseLeave={() => setDestaqueTema(null)}
                onFocus={() => setDestaqueTema(t.id)}
                onBlur={() => setDestaqueTema(null)}
                title={`${t.nome} · ${periodoTema(t)} — Clique para detalhes e gerenciar tema`}
                className={`group absolute z-10 cursor-pointer overflow-hidden rounded-xl border-2 bg-gradient-to-b from-[#1A3A6B] to-[#12284a] px-3 py-1.5 text-left text-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E3B965] ${
                  ehDestaque
                    ? '-translate-y-1 shadow-2xl border-[#E3B965] ring-2 ring-[#E3B965]/70'
                    : 'border-[#C9963A]'
                }`}
                style={{
                  left: m * larguraMes + 6,
                  top: Y_TEMAS,
                  width: larguraMes - 12,
                  height: ALT_TEMA,
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9.5px] font-black uppercase tracking-wider text-[#E3B965]">
                    Tema Oficial
                  </span>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-black text-white">
                    {totalEventos} eventos
                  </span>
                </div>
                <span className="block truncate text-[13px] font-black text-white group-hover:text-[#FFF2C2] transition-colors leading-tight mt-0.5">
                  {t.nome}
                </span>
                <span className="block truncate text-[10px] font-semibold text-slate-300">
                  {periodoTema(t)}
                </span>
              </button>
            );
          })}

          {/* BLOCOS DOS EVENTOS PREPARATÓRIOS (Abaixo da linha, exatamente como na planilha) */}
          {layout.todosEventos.map(({ ev, t, m, linha }) => {
            const ehDestaque = destaqueEvento === ev.id || destaqueTema === t.id;
            const depto = DEPARTAMENTOS[ev.departamento] || DEPARTAMENTOS.OUTRO;
            const totalAcoes = ev.acoes?.length || ev.totalAcoes || 0;
            const orcamento = ev.orcamentoTotal || (ev.acoes || []).reduce((s, a) => s + Number(a.valor || 0), 0);

            // Filtragem por departamento
            const atendeDepto = !departamentoFiltro || ev.departamento === departamentoFiltro;

            return (
              <button
                key={ev.id}
                type="button"
                onClick={() => onAbrirEvento(ev, t)}
                onMouseEnter={() => {
                  setDestaqueEvento(ev.id);
                  setDestaqueTema(t.id);
                }}
                onMouseLeave={() => {
                  setDestaqueEvento(null);
                  setDestaqueTema(null);
                }}
                onFocus={() => {
                  setDestaqueEvento(ev.id);
                  setDestaqueTema(t.id);
                }}
                onBlur={() => {
                  setDestaqueEvento(null);
                  setDestaqueTema(null);
                }}
                title={`${ev.nome} (Evento de ${t.nome}) — Clique para abrir ações, planejamento e orçamento`}
                className={`group absolute z-10 cursor-pointer overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A3A6B] ${
                  atendeDepto ? 'opacity-100 scale-100' : 'opacity-25 scale-95'
                } ${
                  ehDestaque
                    ? '-translate-y-1 border-[#C9963A] ring-2 ring-[#C9963A]/70 shadow-xl'
                    : 'border-slate-200 hover:border-[#1A3A6B]'
                }`}
                style={{
                  left: m * larguraMes + 6,
                  top: Y_EVENTOS + linha * (ALT_EVENTO + 16),
                  width: larguraMes - 12,
                  height: ALT_EVENTO,
                  background: '#ffffff',
                }}
              >
                {/* Linha 1: Cabeçalho com cor do departamento (Nome do Evento) */}
                <div
                  className="px-2.5 py-1 text-white flex items-center justify-between"
                  style={{ backgroundColor: depto.cor }}
                >
                  <span className="block truncate text-[11.5px] font-black uppercase tracking-wider drop-shadow-xs">
                    {ev.nome}
                  </span>
                  <span className="text-[9px] font-bold opacity-85">
                    {formatarDiaCurto(ev.data)}
                  </span>
                </div>

                {/* Linha 2 e 3: PLANEJAMENTO e ORÇAMENTO (Padrão Planilha) */}
                <div className="p-2 space-y-1 bg-white">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-extrabold uppercase tracking-wider text-slate-400">Planejamento</span>
                    <span className="font-bold text-[#1A3A6B]">
                      {totalAcoes > 0 ? `${totalAcoes} ação(ões)` : 'Definir ações'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-1">
                    <span className="font-extrabold uppercase tracking-wider text-slate-400">Orçamento</span>
                    <span className="font-black text-[#C9963A]">
                      {moeda(orcamento)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}

          {layout.temasVisiveis.length === 0 && (
            <div className="absolute inset-x-0 flex items-center justify-center text-sm font-semibold text-slate-400" style={{ top: Y_TEMAS + 20 }}>
              Nenhum tema planejado para os meses deste ciclo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default LinhaDoTempo;
