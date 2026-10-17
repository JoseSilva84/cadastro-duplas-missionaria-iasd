import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes } from '../contexts/NotificacoesContext';
import { toastError } from '../lib/toast';

function NotificationRow({ item, aoAbrir, aoApagar }) {
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
    <div className={`relative flex items-start transition-transform ${item.lidaEm ? 'bg-white' : 'bg-amber-50'}`} style={{ transform: `translateX(${deslocamento}px)` }}>
      <button type="button" onClick={() => { if (!ignorarClique.current) aoAbrir(item); }} className="min-w-0 flex-1 px-4 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#C9963A]">
        <span className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.lidaEm ? 'bg-transparent' : 'bg-[#C9963A]'}`} /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#1A3A6B]">{item.titulo}</span><span className="mt-0.5 block text-sm text-slate-600">{item.mensagem}</span><time className="mt-1 block text-xs text-slate-400">{new Date(item.criadaEm).toLocaleString('pt-BR')}</time></span></span>
      </button>
      <button type="button" aria-label={`Apagar notificação: ${item.titulo}`} title="Apagar notificação" onClick={() => aoApagar(item)} className="m-2 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-500">✕</button>
    </div>
  </div>;
}

export default function NotificationBell({ align = 'right' }) {
  const [aberto, setAberto] = useState(false);
  const fecharEm = useRef(null);
  const { itens, naoLidas, pagina, paginas, carregar, marcarLida, marcarTodas, apagar } = useNotificacoes();
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
          {itens.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhuma notificação ainda.</p> : itens.map((item) => <NotificationRow key={item.id} item={item} aoAbrir={abrir} aoApagar={apagarItem} />)}
        </div>
        {paginas > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          <button disabled={pagina <= 1} onClick={() => carregar(pagina - 1)} className="disabled:opacity-40">Anterior</button><span>{pagina} de {paginas}</span><button disabled={pagina >= paginas} onClick={() => carregar(pagina + 1)} className="disabled:opacity-40">Próxima</button>
        </div>}
      </section>
    </>}
  </div>;
}
