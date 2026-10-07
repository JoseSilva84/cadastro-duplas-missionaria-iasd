import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import {
  chaveMes, corDaAcao, formatarDiaCurto, moeda, origemDaAcao, periodoTema,
} from '../../lib/calendario';

const ALT_CABECALHO = 62;
const ALT_TEMA = 68;
const ALT_ACAO = 68;
const TOPO_TEMAS = ALT_CABECALHO + 36;
const FOLGA = 124;
const MAX_ACOES_MES = 4;

const IconeSeta = ({ lado }) => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={lado === 'esq' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'} />
  </svg>
);

const LinhaDoTempo = forwardRef(function LinhaDoTempo({
  temas,
  meses,
  departamentoFiltro,
  onAbrir,
  onAbrirMes,
}, ref) {
  const rolagemRef = useRef(null);
  const arrasto = useRef({ ativo: false, x: 0, esquerda: 0, moveu: false });
  const [largura, setLargura] = useState(1000);
  const [arrastando, setArrastando] = useState(false);
  const [destaqueTema, setDestaqueTema] = useState(null);
  const [limites, setLimites] = useState({ inicio: true, fim: false });

  const larguraMes = useMemo(() => {
    const visiveis = largura >= 1100 ? 6 : largura >= 720 ? 4 : 2.3;
    return Math.max(120, Math.floor(largura / visiveis));
  }, [largura]);

  const rolarParaMes = useCallback((indiceMes) => {
    const el = rolagemRef.current;
    if (!el || indiceMes < 0 || indiceMes >= 12) return;
    el.scrollTo({ left: indiceMes * larguraMes, behavior: 'smooth' });
  }, [larguraMes]);

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

  // Arrastar com o mouse (mãozinha)
  useEffect(() => {
    const mover = (e) => {
      const a = arrasto.current;
      if (!a.ativo) return;
      const delta = e.clientX - a.x;
      if (Math.abs(delta) > 5) a.moveu = true;
      rolagemRef.current.scrollLeft = a.esquerda - delta;
    };
    const soltar = () => {
      if (!arrasto.current.ativo) return;
      arrasto.current.ativo = false;
      setArrastando(false);
      setTimeout(() => { arrasto.current.moveu = false; }, 0);
    };
    window.addEventListener('mousemove', mover);
    window.addEventListener('mouseup', soltar);
    return () => { window.removeEventListener('mousemove', mover); window.removeEventListener('mouseup', soltar); };
  }, []);

  const iniciarArrasto = (e) => {
    if (e.button !== 0) return;
    arrasto.current = { ativo: true, x: e.clientX, esquerda: rolagemRef.current.scrollLeft, moveu: false };
    setArrastando(true);
  };

  const bloquearCliqueAposArrasto = (e) => {
    if (arrasto.current.moveu) { e.preventDefault(); e.stopPropagation(); }
  };

  const rolar = (sentido) => rolagemRef.current?.scrollBy({ left: sentido * larguraMes * 3, behavior: 'smooth' });

  const inicioJanela = meses[0].key;
  const posicao = (data) => (data ? chaveMes(data) - inicioJanela : -1);

  const layout = useMemo(() => {
    const ocupacaoTema = Array(12).fill(0);
    const temasVisiveis = temas
      .map((t) => ({ t, m: posicao(t.dataInicio) }))
      .filter(({ m }) => m >= 0 && m < 12)
      .map((p) => { const linha = ocupacaoTema[p.m]; ocupacaoTema[p.m] += 1; return { ...p, linha }; });
    const idsVisiveis = new Set(temasVisiveis.map((p) => p.t.id));
    const linhasTema = Math.max(1, ...ocupacaoTema);
    const topoAcoes = TOPO_TEMAS + linhasTema * (ALT_TEMA + 14) + FOLGA;

    const porMes = Array.from({ length: 12 }, () => []);
    temas.forEach((t) => {
      if (!idsVisiveis.has(t.id)) return;
      t.acoes.forEach((a) => {
        const m = posicao(a.data || t.dataInicio);
        if (m >= 0 && m < 12) porMes[m].push({ a, t });
      });
    });

    const acoes = [];
    const extras = [];
    porMes.forEach((lista, m) => {
      const mostrar = lista.length > MAX_ACOES_MES ? MAX_ACOES_MES - 1 : lista.length;
      lista.slice(0, mostrar).forEach((item, linha) => acoes.push({ ...item, m, linha }));
      if (lista.length > mostrar) extras.push({ m, linha: mostrar, itens: lista.slice(mostrar), total: lista.length });
    });
    const linhasAcao = Math.max(1, ...porMes.map((l) => Math.min(l.length, MAX_ACOES_MES)));
    const altura = topoAcoes + linhasAcao * (ALT_ACAO + 12) + 32;
    return { temasVisiveis, acoes, extras, topoAcoes, altura };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temas, inicioJanela]);

  const yTema = (linha) => TOPO_TEMAS + linha * (ALT_TEMA + 14);
  const yAcao = (linha) => layout.topoAcoes + linha * (ALT_ACAO + 12);
  const posTema = new Map(layout.temasVisiveis.map((p) => [p.t.id, p]));
  const totalLargura = larguraMes * 12;
  const contagemPorTema = {};
  layout.acoes.forEach(({ t }) => { contagemPorTema[t.id] = (contagemPorTema[t.id] || 0) + 1; });
  const indicePorTema = {};

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_45px_-18px_rgba(26,58,107,0.32)]">
      {/* Botões de navegação lateral rápida */}
      <button
        type="button"
        onClick={() => rolar(-1)}
        disabled={limites.inicio}
        aria-label="Meses anteriores"
        className="absolute left-2.5 top-[92px] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-[#1A3A6B] shadow-xl backdrop-blur transition hover:scale-110 hover:bg-[#1A3A6B] hover:text-white disabled:pointer-events-none disabled:opacity-0 active:scale-95"
      >
        <IconeSeta lado="esq" />
      </button>

      <button
        type="button"
        onClick={() => rolar(1)}
        disabled={limites.fim}
        aria-label="Próximos meses"
        className="absolute right-2.5 top-[92px] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/90 bg-white/95 text-[#1A3A6B] shadow-xl backdrop-blur transition hover:scale-110 hover:bg-[#1A3A6B] hover:text-white disabled:pointer-events-none disabled:opacity-0 active:scale-95"
      >
        <IconeSeta lado="dir" />
      </button>

      {/* Sombras suaves nas bordas de rolagem */}
      <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white/95 to-transparent transition-opacity duration-300 ${limites.inicio ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white/95 to-transparent transition-opacity duration-300 ${limites.fim ? 'opacity-0' : 'opacity-100'}`} />

      {/* Contêiner com rolagem e mãozinha */}
      <div
        ref={rolagemRef}
        onScroll={atualizarLimites}
        onMouseDown={iniciarArrasto}
        onClickCapture={bloquearCliqueAposArrasto}
        className={`overflow-x-auto overflow-y-hidden ${arrastando ? 'cursor-grabbing select-none' : 'cursor-grab'} [scrollbar-width:thin] transition-colors`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="relative" style={{ width: totalLargura, height: layout.altura }}>
          {/* Colunas dos meses */}
          <div className="absolute inset-0 flex">
            {meses.map((m, i) => (
              <div
                key={m.key}
                className={`h-full border-r border-slate-200/70 transition-colors ${i % 2 ? 'bg-slate-50/50' : 'bg-white'}`}
                style={{ width: larguraMes }}
              />
            ))}
          </div>

          {/* Cabeçalho elegante dos 12 meses */}
          <div className="absolute inset-x-0 top-0 flex bg-gradient-to-b from-[#1A3A6B] via-[#16335e] to-[#112749]" style={{ height: ALT_CABECALHO }}>
            {meses.map((m, i) => (
              <div
                key={m.key}
                className="relative flex flex-col items-center justify-center border-r border-white/10"
                style={{ width: larguraMes }}
              >
                <span className="text-sm font-extrabold uppercase tracking-[0.24em] text-white drop-shadow-sm">{m.nome}</span>
                <span className="mt-0.5 text-[11px] font-bold tracking-widest text-[#E3B965]">{m.ano}</span>
                {i === 0 && (
                  <span className="absolute -bottom-px left-1/2 h-[3.5px] w-12 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#C9963A] to-[#F7D488] shadow-sm" />
                )}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 h-[3px] bg-gradient-to-r from-[#C9963A] via-[#E3B965] to-[#C9963A]" style={{ top: ALT_CABECALHO }} />

          {/* Rótulos das seções */}
          <div className="absolute left-3 flex items-center gap-1.5" style={{ top: ALT_CABECALHO + 10 }}>
            <span className="h-1.5 w-1.5 rounded-full bg-[#C9963A]" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#C9963A]">Temas principais da Associação</p>
          </div>

          <div className="absolute left-3 flex items-center gap-1.5" style={{ top: layout.topoAcoes - 24 }}>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-500">Ações dos Departamentos e Igrejas</p>
          </div>

          {/* Linhas e Setas de conexão SVG entre ações e temas */}
          <svg className="pointer-events-none absolute left-0 top-0" width={totalLargura} height={layout.altura} aria-hidden="true">
            {layout.acoes.map(({ a, t, m, linha }) => {
              const ev = posTema.get(t.id);
              if (!ev) return null;
              const indice = indicePorTema[t.id] || 0;
              indicePorTema[t.id] = indice + 1;
              const n = Math.min(contagemPorTema[t.id], 8);
              const desvio = (Math.min(indice, 7) - (n - 1) / 2) * 7.5;
              const x1 = m * larguraMes + larguraMes / 2;
              const y1 = yAcao(linha);
              const x2 = ev.m * larguraMes + larguraMes / 2 + desvio;
              const y2 = yTema(ev.linha) + ALT_TEMA;
              const meio = y1 - (y1 - y2) * 0.55;

              // Filtro por departamento ou destaque
              const atendeDepto = !departamentoFiltro || a.departamento === departamentoFiltro;
              const atendeDestaque = destaqueTema === null || destaqueTema === t.id;
              const visivel = atendeDepto && atendeDestaque;
              const cor = corDaAcao(a);

              return (
                <g key={a.id} className="transition-all duration-300" opacity={visivel ? 1 : 0.08}>
                  <path
                    d={`M${x1} ${y1} C ${x1} ${meio}, ${x2} ${meio}, ${x2} ${y2 + 5}`}
                    fill="none"
                    stroke={cor}
                    strokeOpacity={destaqueTema === t.id ? 0.95 : 0.55}
                    strokeWidth={destaqueTema === t.id ? 2.6 : 1.75}
                  />
                  <circle cx={x1} cy={y1} r="3.5" fill={cor} />
                  <path
                    d={`M${x2 - 5} ${y2 + 8} L${x2} ${y2 + 1} L${x2 + 5} ${y2 + 8}`}
                    fill="none"
                    stroke={cor}
                    strokeOpacity={destaqueTema === t.id ? 0.95 : 0.65}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </svg>

          {/* Blocos de Temas */}
          {layout.temasVisiveis.map(({ t, m, linha }) => {
            const ehDestaque = destaqueTema === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onAbrir(t.id)}
                onMouseEnter={() => setDestaqueTema(t.id)}
                onMouseLeave={() => setDestaqueTema(null)}
                onFocus={() => setDestaqueTema(t.id)}
                onBlur={() => setDestaqueTema(null)}
                title={`${t.nome} · ${periodoTema(t)} — Clique para detalhes e ações`}
                className={`group absolute cursor-pointer overflow-hidden rounded-xl border border-[#C9963A]/60 bg-gradient-to-br from-[#FFFDF7] via-[#FFF9EB] to-[#FBEBC1] px-3 py-2 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9963A] ${
                  ehDestaque ? '-translate-y-1 shadow-xl ring-2 ring-[#C9963A]/80 border-[#C9963A]' : ''
                }`}
                style={{
                  left: m * larguraMes + 7,
                  top: yTema(linha),
                  width: larguraMes - 14,
                  height: ALT_TEMA,
                  borderLeft: '5.5px solid #C9963A',
                }}
              >
                <span className="block text-[13px] font-extrabold leading-snug text-[#1A3A6B] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden group-hover:text-[#9A6F1F] transition-colors">
                  {t.nome}
                </span>
                <span className="mt-1 flex items-center justify-between text-[10.5px] font-semibold text-slate-500">
                  <span className="truncate">{periodoTema(t)}</span>
                  <span className="shrink-0 font-bold text-[#C9963A]">({t.acoes.length})</span>
                </span>
              </button>
            );
          })}

          {/* Blocos de Ações Missionárias */}
          {layout.acoes.map(({ a, t, m, linha }) => {
            const origem = origemDaAcao(a);
            const cor = corDaAcao(a);
            const atendeDepto = !departamentoFiltro || a.departamento === departamentoFiltro;
            const atendeDestaque = destaqueTema === null || destaqueTema === t.id;
            const ativo = atendeDepto && atendeDestaque;

            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onAbrir(t.id, a.id)}
                onMouseEnter={() => setDestaqueTema(t.id)}
                onMouseLeave={() => setDestaqueTema(null)}
                onFocus={() => setDestaqueTema(t.id)}
                onBlur={() => setDestaqueTema(null)}
                title={`${a.nome} — ${origem.cargo} · ${origem.local} → ${t.nome}`}
                className={`group absolute cursor-pointer overflow-hidden rounded-xl px-3 py-1.5 text-left text-white shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  ativo ? 'scale-100 opacity-100' : 'scale-95 opacity-20'
                }`}
                style={{
                  left: m * larguraMes + 7,
                  top: yAcao(linha),
                  width: larguraMes - 14,
                  height: ALT_ACAO,
                  background: `linear-gradient(135deg, ${cor}, ${cor}d6)`,
                  boxShadow: ativo && destaqueTema === t.id ? `0 8px 22px -6px ${cor}88` : undefined,
                }}
              >
                <span className="block truncate text-[12.5px] font-extrabold leading-tight drop-shadow-sm">
                  {a.nome}
                </span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-95">
                  {origem.cargo} · {origem.local}
                </span>
                <span className="block truncate text-[9.5px] font-bold opacity-85">
                  {formatarDiaCurto(a.data)} · {moeda(a.valor)}
                </span>
              </button>
            );
          })}

          {/* Botão de + ações caso exceda o limite visual por mês */}
          {layout.extras.map(({ m, linha, itens, total }) => (
            <button
              key={`mais-${m}`}
              type="button"
              onClick={() => onAbrirMes(m, itens)}
              className="absolute flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/90 text-xs font-bold text-slate-600 shadow-sm transition hover:scale-105 hover:border-[#C9963A] hover:text-[#C9963A] active:scale-95"
              style={{ left: m * larguraMes + 7, top: yAcao(linha), width: larguraMes - 14, height: ALT_ACAO }}
            >
              +{itens.length} de {total} ações
            </button>
          ))}

          {layout.temasVisiveis.length === 0 && (
            <div className="absolute inset-x-0 flex items-center justify-center text-sm font-semibold text-slate-400" style={{ top: TOPO_TEMAS + 24 }}>
              Nenhum tema planejado nos próximos 12 meses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default LinhaDoTempo;
