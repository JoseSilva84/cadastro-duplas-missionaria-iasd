import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  chaveMes, corDaAcao, formatarDiaCurto, moeda, origemDaAcao, periodoTema,
} from '../../lib/calendario';

const ALT_CABECALHO = 60;
const ALT_TEMA = 66;
const ALT_ACAO = 66;
const TOPO_TEMAS = ALT_CABECALHO + 34;
const FOLGA = 120;
const MAX_ACOES_MES = 4;

const IconeSeta = ({ lado }) => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={lado === 'esq' ? 'M12.5 4.5 7 10l5.5 5.5' : 'M7.5 4.5 13 10l-5.5 5.5'} />
  </svg>
);

export default function LinhaDoTempo({ temas, meses, onAbrir, onAbrirMes }) {
  const rolagemRef = useRef(null);
  const arrasto = useRef({ ativo: false, x: 0, esquerda: 0, moveu: false });
  const [largura, setLargura] = useState(1000);
  const [arrastando, setArrastando] = useState(false);
  const [destaque, setDestaque] = useState(null);
  const [limites, setLimites] = useState({ inicio: true, fim: false });

  const larguraMes = useMemo(() => {
    const visiveis = largura >= 1100 ? 6 : largura >= 720 ? 4 : 2.3;
    return Math.max(118, Math.floor(largura / visiveis));
  }, [largura]);

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

  // Arrastar com o mouse (no toque, a rolagem nativa ja funciona).
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
    const topoAcoes = TOPO_TEMAS + linhasTema * (ALT_TEMA + 12) + FOLGA;

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
    const altura = topoAcoes + linhasAcao * (ALT_ACAO + 10) + 28;
    return { temasVisiveis, acoes, extras, topoAcoes, altura };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [temas, inicioJanela]);

  const yTema = (linha) => TOPO_TEMAS + linha * (ALT_TEMA + 12);
  const yAcao = (linha) => layout.topoAcoes + linha * (ALT_ACAO + 10);
  const posTema = new Map(layout.temasVisiveis.map((p) => [p.t.id, p]));
  const totalLargura = larguraMes * 12;
  const contagemPorTema = {};
  layout.acoes.forEach(({ t }) => { contagemPorTema[t.id] = (contagemPorTema[t.id] || 0) + 1; });
  const indicePorTema = {};

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_40px_-18px_rgba(26,58,107,0.35)]">
      <button type="button" onClick={() => rolar(-1)} disabled={limites.inicio} aria-label="Meses anteriores"
        className="absolute left-2 top-[88px] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-[#1A3A6B] shadow-lg backdrop-blur transition hover:scale-105 hover:bg-[#1A3A6B] hover:text-white disabled:pointer-events-none disabled:opacity-0">
        <IconeSeta lado="esq" />
      </button>
      <button type="button" onClick={() => rolar(1)} disabled={limites.fim} aria-label="Próximos meses"
        className="absolute right-2 top-[88px] z-20 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-[#1A3A6B] shadow-lg backdrop-blur transition hover:scale-105 hover:bg-[#1A3A6B] hover:text-white disabled:pointer-events-none disabled:opacity-0">
        <IconeSeta lado="dir" />
      </button>
      <div className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent transition-opacity ${limites.inicio ? 'opacity-0' : 'opacity-100'}`} />
      <div className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent transition-opacity ${limites.fim ? 'opacity-0' : 'opacity-100'}`} />

      <div
        ref={rolagemRef}
        onScroll={atualizarLimites}
        onMouseDown={iniciarArrasto}
        onClickCapture={bloquearCliqueAposArrasto}
        className={`overflow-x-auto overflow-y-hidden ${arrastando ? 'cursor-grabbing select-none' : 'cursor-grab'} [scrollbar-width:thin]`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="relative" style={{ width: totalLargura, height: layout.altura }}>
          {/* colunas */}
          <div className="absolute inset-0 flex">
            {meses.map((m, i) => (
              <div key={m.key} className={`h-full border-r border-dashed border-slate-200 ${i % 2 ? 'bg-slate-50/70' : 'bg-white'}`} style={{ width: larguraMes }} />
            ))}
          </div>

          {/* cabecalho dos meses */}
          <div className="absolute inset-x-0 top-0 flex bg-gradient-to-b from-[#1A3A6B] to-[#13294d]" style={{ height: ALT_CABECALHO }}>
            {meses.map((m, i) => (
              <div key={m.key} className="relative flex flex-col items-center justify-center border-r border-white/10" style={{ width: larguraMes }}>
                <span className="text-sm font-bold uppercase tracking-[0.22em] text-white">{m.nome}</span>
                <span className="mt-0.5 text-[11px] font-semibold tracking-widest text-[#E3B965]">{m.ano}</span>
                {i === 0 && <span className="absolute -bottom-px left-1/2 h-[3px] w-10 -translate-x-1/2 rounded-full bg-[#C9963A]" />}
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 h-[3px] bg-gradient-to-r from-[#C9963A] via-[#E3B965] to-[#C9963A]" style={{ top: ALT_CABECALHO }} />

          <p className="absolute left-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#C9963A]" style={{ top: ALT_CABECALHO + 10 }}>Temas dos eventos</p>
          <p className="absolute left-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400" style={{ top: layout.topoAcoes - 22 }}>Ações missionárias</p>

          {/* setas das acoes para o tema */}
          <svg className="pointer-events-none absolute left-0 top-0" width={totalLargura} height={layout.altura} aria-hidden="true">
            {layout.acoes.map(({ a, t, m, linha }) => {
              const ev = posTema.get(t.id);
              if (!ev) return null;
              const indice = indicePorTema[t.id] || 0;
              indicePorTema[t.id] = indice + 1;
              const n = Math.min(contagemPorTema[t.id], 8);
              const desvio = (Math.min(indice, 7) - (n - 1) / 2) * 7;
              const x1 = m * larguraMes + larguraMes / 2;
              const y1 = yAcao(linha);
              const x2 = ev.m * larguraMes + larguraMes / 2 + desvio;
              const y2 = yTema(ev.linha) + ALT_TEMA;
              const meio = y1 - (y1 - y2) * 0.55;
              const ativo = destaque === null || destaque === t.id;
              return (
                <g key={a.id} style={{ transition: 'opacity .2s' }} opacity={ativo ? 1 : 0.12}>
                  <path d={`M${x1} ${y1} C ${x1} ${meio}, ${x2} ${meio}, ${x2} ${y2 + 5}`} fill="none" stroke={corDaAcao(a)} strokeOpacity={destaque === t.id ? 0.95 : 0.5} strokeWidth={destaque === t.id ? 2.4 : 1.6} />
                  <circle cx={x1} cy={y1} r="3.5" fill={corDaAcao(a)} />
                  <path d={`M${x2 - 5} ${y2 + 8} L${x2} ${y2 + 1} L${x2 + 5} ${y2 + 8}`} fill="none" stroke={corDaAcao(a)} strokeOpacity={destaque === t.id ? 0.95 : 0.6} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              );
            })}
          </svg>

          {/* temas */}
          {layout.temasVisiveis.map(({ t, m, linha }) => (
            <button key={t.id} type="button" onClick={() => onAbrir(t.id)}
              onMouseEnter={() => setDestaque(t.id)} onMouseLeave={() => setDestaque(null)} onFocus={() => setDestaque(t.id)} onBlur={() => setDestaque(null)}
              title={`${t.nome} · ${periodoTema(t)}`}
              className={`absolute cursor-pointer overflow-hidden rounded-xl border border-[#C9963A]/50 bg-gradient-to-br from-[#FFFBEF] to-[#FBEBC1] px-3 text-left shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9963A] ${destaque === t.id ? '-translate-y-1 shadow-xl' : ''}`}
              style={{ left: m * larguraMes + 7, top: yTema(linha), width: larguraMes - 14, height: ALT_TEMA, borderLeft: '5px solid #C9963A' }}>
              <span className="mt-2 block text-[13px] font-extrabold leading-tight text-[#1A3A6B] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">{t.nome}</span>
              <span className="mt-1 block truncate text-[10.5px] font-semibold text-slate-500">{periodoTema(t)}</span>
            </button>
          ))}

          {/* acoes */}
          {layout.acoes.map(({ a, t, m, linha }) => {
            const origem = origemDaAcao(a);
            return (
              <button key={a.id} type="button" onClick={() => onAbrir(t.id, a.id)}
                onMouseEnter={() => setDestaque(t.id)} onMouseLeave={() => setDestaque(null)} onFocus={() => setDestaque(t.id)} onBlur={() => setDestaque(null)}
                title={`${a.nome} — ${origem.cargo} · ${origem.local} → ${t.nome}`}
                className="absolute cursor-pointer overflow-hidden rounded-xl px-3 text-left text-white shadow-md transition duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ left: m * larguraMes + 7, top: yAcao(linha), width: larguraMes - 14, height: ALT_ACAO, background: `linear-gradient(135deg, ${corDaAcao(a)}, ${corDaAcao(a)}d9)`, opacity: destaque === null || destaque === t.id ? 1 : 0.35 }}>
                <span className="mt-2 block truncate text-[12.5px] font-bold leading-tight">{a.nome}</span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-90">{origem.cargo} · {origem.local}</span>
                <span className="block truncate text-[10px] font-semibold opacity-80">{formatarDiaCurto(a.data)} · {moeda(a.valor)}</span>
              </button>
            );
          })}

          {layout.extras.map(({ m, linha, itens, total }) => (
            <button key={`mais-${m}`} type="button" onClick={() => onAbrirMes(m, itens)}
              className="absolute flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/80 text-xs font-bold text-slate-500 transition hover:border-[#C9963A] hover:text-[#C9963A]"
              style={{ left: m * larguraMes + 7, top: yAcao(linha), width: larguraMes - 14, height: ALT_ACAO }}>
              +{itens.length} de {total} ações
            </button>
          ))}

          {layout.temasVisiveis.length === 0 && (
            <div className="absolute inset-x-0 flex items-center justify-center text-sm text-slate-400" style={{ top: TOPO_TEMAS + 20 }}>
              Nenhum tema nos próximos 12 meses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
