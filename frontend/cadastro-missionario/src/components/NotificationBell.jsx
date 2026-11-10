import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes } from '../contexts/NotificacoesContext';
import { toastError, toastSuccess } from '../lib/toast';

const REACOES = [
  { valor: 'PALMAS', emoji: '👏', rotulo: 'Palmas' },
  { valor: 'ORACAO', emoji: '🙏', rotulo: 'Oração' },
  { valor: 'TRISTE', emoji: '😢', rotulo: 'Triste' },
  { valor: 'CORACAO', emoji: '❤️', rotulo: 'Coração' },
  { valor: 'ALEGRIA', emoji: '🙌', rotulo: 'Alegria' },
  { valor: 'APOIO', emoji: '👍', rotulo: 'Apoio' },
];

function ResponderNotificacaoModal({ item, aoFechar, aoResponder }) {
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const enviar = async (evento) => {
    evento.preventDefault();
    if (!mensagem.trim() || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      const resultado = await aoResponder(item.id, mensagem.trim());
      toastSuccess(`Resposta enviada para ${resultado.destinatario?.nome || item.remetenteNome}.`);
      aoFechar();
    } catch (falha) {
      setErro(falha.response?.data?.erro || 'Não foi possível enviar a resposta.');
    } finally {
      setEnviando(false);
    }
  };
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) aoFechar(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="responder-notificacao-titulo" className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Resposta de notificação</p>
            <h2 id="responder-notificacao-titulo" className="mt-1 text-xl font-bold text-[#1A3A6B]">Responder para {item.remetenteNome}</h2>
          </div>
          <button type="button" onClick={aoFechar} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar">✕</button>
        </div>
        <form onSubmit={enviar} className="overflow-y-auto p-4 sm:p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <p className="text-sm font-bold text-[#1A3A6B]">{item.titulo}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{item.mensagem}</p>
          </div>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Sua resposta</span>
            <textarea autoFocus rows={6} maxLength={1000} required value={mensagem} onChange={(evento) => setMensagem(evento.target.value)} className="input-field min-h-36 resize-y" placeholder="Escreva a resposta que será enviada como uma nova notificação." />
            <span className="mt-1 block text-right text-xs text-slate-400">{mensagem.length}/1000</span>
          </label>
          {erro && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={aoFechar} className="btn-outline px-4 py-2.5 text-sm">Cancelar</button>
            <button type="submit" disabled={enviando || !mensagem.trim()} className="btn-primary px-4 py-2.5 text-sm disabled:opacity-50">{enviando ? 'Enviando…' : 'Publicar resposta'}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function NotificationRow({ item, aoAbrir, aoApagar, aoResponder, aoReagir, reagindo }) {
  const toque = useRef(null);
  const ignorarClique = useRef(false);
  const [deslocamento, setDeslocamento] = useState(0);

  const iniciar = (evento) => {
    const ponto = evento.touches[0];
    toque.current = { x: ponto.clientX, y: ponto.clientY, dx: 0 };
  };
  const mover = (evento) => {
    if (!toque.current) return;
    const ponto = evento.touches[0];
    const dx = ponto.clientX - toque.current.x;
    const dy = ponto.clientY - toque.current.y;
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      toque.current.dx = dx;
      setDeslocamento(Math.max(-110, Math.min(110, dx)));
    }
  };
  const terminar = () => {
    const dx = toque.current?.dx || 0;
    toque.current = null;
    setDeslocamento(0);
    if (Math.abs(dx) >= 75) {
      ignorarClique.current = true;
      aoApagar(item);
      window.setTimeout(() => { ignorarClique.current = false; }, 350);
    }
  };
  const cancelar = () => { toque.current = null; setDeslocamento(0); };

  return <div className="relative overflow-hidden border-b border-slate-100" onTouchStart={iniciar} onTouchMove={mover} onTouchEnd={terminar} onTouchCancel={cancelar} style={{ touchAction: 'pan-y' }}>
    <div className="absolute inset-0 flex items-center justify-between bg-red-50 px-5 text-xs font-semibold text-red-700" aria-hidden="true"><span>Apagar</span><span>Apagar</span></div>
    <div className={`relative transition-transform ${item.lidaEm ? 'bg-white' : 'bg-amber-50'}`} style={{ transform: `translateX(${deslocamento}px)` }}>
      <div className="flex items-start">
        <button type="button" onClick={() => { if (!ignorarClique.current) aoAbrir(item); }} className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#C9963A]">
          <span className="flex items-start gap-2">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.lidaEm ? 'bg-transparent' : 'bg-[#C9963A]'}`} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[#1A3A6B]">{item.titulo}</span>
              {item.remetenteNome && <span className="mt-0.5 block text-xs font-semibold text-slate-500">De: {item.remetenteNome}</span>}
              <span className="mt-0.5 block whitespace-pre-wrap break-words text-sm text-slate-600">{item.mensagem}</span>
              {item.respondendoA && <span className="mt-2 block rounded-lg border border-blue-100 bg-blue-50/70 p-2 text-xs text-blue-900"><strong>{item.tipo === 'REACAO' ? 'Em reação a:' : 'Em resposta a:'}</strong> {item.respondendoA.titulo}<span className="mt-0.5 block line-clamp-2 text-blue-800/75">{item.respondendoA.mensagem}</span></span>}
              <time className="mt-1 block text-xs text-slate-400">{new Date(item.criadaEm).toLocaleString('pt-BR')}</time>
            </span>
          </span>
        </button>
        <button type="button" aria-label={`Apagar notificação: ${item.titulo}`} title="Apagar notificação" onClick={() => aoApagar(item)} className="m-2 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-500">✕</button>
      </div>
      {item.podeReagir && <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2" aria-label="Reagir à notificação">
        <span className="mr-1 text-[11px] font-semibold text-slate-500">Reagir:</span>
        {REACOES.map((opcao) => <button
          key={opcao.valor}
          type="button"
          disabled={reagindo}
          onClick={() => aoReagir(item, opcao)}
          className={`flex h-8 w-8 items-center justify-center rounded-full text-base transition hover:scale-110 hover:bg-slate-100 disabled:opacity-50 ${item.reacao === opcao.valor ? 'bg-amber-100 ring-2 ring-[#C9963A]' : 'bg-white'}`}
          aria-label={`Reagir com ${opcao.rotulo}`}
          title={opcao.rotulo}
        >{opcao.emoji}</button>)}
      </div>}
      {(item.podeResponder || item.respostaEnviada) && <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2">
        {item.respostaEnviada
          ? <span className="text-xs font-semibold text-emerald-700">Respondido para {item.respostaEnviada.destinatarioNome}</span>
          : <span />}
        {item.podeResponder && <button type="button" onClick={() => aoResponder(item)} className="rounded-lg bg-[#1A3A6B]/10 px-3 py-1.5 text-xs font-bold text-[#1A3A6B] hover:bg-[#1A3A6B]/15">Responder</button>}
      </div>}
    </div>
  </div>;
}

export default function NotificationBell({ align = 'right' }) {
  const [aberto, setAberto] = useState(false);
  const [respondendo, setRespondendo] = useState(null);
  const [reagindoId, setReagindoId] = useState(null);
  const fecharEm = useRef(null);
  const { itens, naoLidas, pagina, paginas, carregar, marcarLida, marcarTodas, apagar, responder, reagir } = useNotificacoes();
  const navigate = useNavigate();

  useEffect(() => () => window.clearTimeout(fecharEm.current), []);
  const cancelarFechamento = () => window.clearTimeout(fecharEm.current);
  const agendarFechamento = () => {
    cancelarFechamento();
    fecharEm.current = window.setTimeout(() => setAberto(false), 250);
  };
  const abrirLista = () => {
    cancelarFechamento();
    if (!aberto) {
      setAberto(true);
      carregar(1).catch(() => {});
    }
  };
  const abrir = async (item) => {
    try { if (!item.lidaEm) await marcarLida(item.id); }
    catch { toastError('Não foi possível marcar a notificação como lida.'); }
    setAberto(false);
    if (item.url?.startsWith('/') && !item.url.startsWith('//')) navigate(item.url);
  };
  const apagarItem = async (item) => {
    try { await apagar(item.id); }
    catch { toastError('Não foi possível apagar a notificação.'); }
  };
  const abrirResposta = (item) => {
    cancelarFechamento();
    setAberto(false);
    setRespondendo(item);
  };
  const reagirItem = async (item, opcao) => {
    if (reagindoId) return;
    setReagindoId(item.id);
    try {
      const resultado = await reagir(item.id, opcao.valor);
      if (resultado.alterada) toastSuccess(`${opcao.emoji} Reação enviada para ${resultado.destinatario?.nome || item.remetenteNome}.`);
    } catch (falha) {
      toastError(falha.response?.data?.erro || 'Não foi possível enviar a reação.');
    } finally {
      setReagindoId(null);
    }
  };

  return <div className="relative" onMouseEnter={() => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) abrirLista();
  }} onMouseLeave={() => { if (aberto) agendarFechamento(); }}>
    <button type="button" aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : 'Notificações'} aria-expanded={aberto}
      onClick={() => { cancelarFechamento(); if (aberto) setAberto(false); else abrirLista(); }}
      className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-[#C9963A]">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {naoLidas > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#C9963A] px-1 text-[10px] font-bold text-[#0f2347]">{naoLidas > 99 ? '99+' : naoLidas}</span>}
    </button>
    {aberto && <>
      <button className="fixed inset-0 z-40 cursor-default" aria-label="Fechar notificações" onClick={() => setAberto(false)} />
      <section className={`fixed inset-x-3 top-16 z-50 max-h-[min(70vh,620px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:top-12 sm:w-[380px] ${align === 'left' ? 'sm:left-0' : 'sm:right-0'}`} aria-label="Histórico de notificações" onMouseEnter={cancelarFechamento} onMouseLeave={agendarFechamento}>
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div><h2 className="font-bold text-[#1A3A6B]">Notificações</h2><p className="text-xs text-slate-500">{naoLidas} não lida{naoLidas === 1 ? '' : 's'}</p></div>
          <div className="flex items-center gap-2">
            {naoLidas > 0 && <button type="button" className="text-xs font-semibold text-[#1A3A6B]" onClick={() => marcarTodas().catch(() => toastError('Não foi possível atualizar as notificações.'))}>Marcar todas como lidas</button>}
            <button type="button" className="rounded-lg p-1 text-slate-500" aria-label="Fechar" onClick={() => setAberto(false)}>✕</button>
          </div>
        </div>
        <div className="max-h-[min(54vh,480px)] overflow-y-auto">
          {itens.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhuma notificação ainda.</p> : itens.map((item) => <NotificationRow key={item.id} item={item} aoAbrir={abrir} aoApagar={apagarItem} aoResponder={abrirResposta} aoReagir={reagirItem} reagindo={reagindoId === item.id} />)}
        </div>
        {paginas > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          <button disabled={pagina <= 1} onClick={() => carregar(pagina - 1)} className="disabled:opacity-40">Anterior</button><span>{pagina} de {paginas}</span><button disabled={pagina >= paginas} onClick={() => carregar(pagina + 1)} className="disabled:opacity-40">Próxima</button>
        </div>}
      </section>
    </>}
    {respondendo && <ResponderNotificacaoModal item={respondendo} aoFechar={() => setRespondendo(null)} aoResponder={responder} />}
  </div>;
}
