import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificacoes } from '../contexts/NotificacoesContext';
import { toastError } from '../lib/toast';

export default function NotificationBell({ align = 'right' }) {
  const [aberto, setAberto] = useState(false);
  const { itens, naoLidas, pagina, paginas, carregar, marcarLida, marcarTodas } = useNotificacoes();
  const navigate = useNavigate();
  const abrir = (item) => async () => {
    try { if (!item.lidaEm) await marcarLida(item.id); }
    catch { toastError('Não foi possível marcar a notificação como lida.'); }
    setAberto(false);
    if (item.url?.startsWith('/') && !item.url.startsWith('//')) navigate(item.url);
  };
  return (
    <div className="relative">
      <button type="button" aria-label={naoLidas ? `Notificações, ${naoLidas} não lidas` : 'Notificações'} aria-expanded={aberto}
        onClick={() => { setAberto(!aberto); if (!aberto) carregar(1).catch(() => {}); }}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-[#C9963A]">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
        {naoLidas > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#C9963A] px-1 text-[10px] font-bold text-[#0f2347]">{naoLidas > 99 ? '99+' : naoLidas}</span>}
      </button>
      {aberto && <>
        <button className="fixed inset-0 z-40 cursor-default" aria-label="Fechar notificações" onClick={() => setAberto(false)} />
        <section className={`fixed inset-x-3 top-16 z-50 max-h-[min(70vh,620px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:absolute sm:inset-x-auto sm:top-12 sm:w-[380px] ${align === 'left' ? 'sm:left-0' : 'sm:right-0'}`} aria-label="Histórico de notificações">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div><h2 className="font-bold text-[#1A3A6B]">Notificações</h2><p className="text-xs text-slate-500">{naoLidas} não lida{naoLidas === 1 ? '' : 's'}</p></div>
            <div className="flex items-center gap-2">
              {naoLidas > 0 && <button type="button" className="text-xs font-semibold text-[#1A3A6B]" onClick={() => marcarTodas().catch(() => toastError('Não foi possível atualizar as notificações.'))}>Marcar todas como lidas</button>}
              <button type="button" className="rounded-lg p-1 text-slate-500" aria-label="Fechar" onClick={() => setAberto(false)}>✕</button>
            </div>
          </div>
          <div className="max-h-[min(54vh,480px)] overflow-y-auto">
            {itens.length === 0 ? <p className="px-5 py-10 text-center text-sm text-slate-500">Nenhuma notificação ainda.</p> : itens.map((item) => (
              <button key={item.id} type="button" onClick={abrir(item)} className={`block w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${item.lidaEm ? '' : 'bg-amber-50/50'}`}>
                <div className="flex items-start gap-2"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.lidaEm ? 'bg-transparent' : 'bg-[#C9963A]'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#1A3A6B]">{item.titulo}</p><p className="mt-0.5 text-sm text-slate-600">{item.mensagem}</p><time className="mt-1 block text-xs text-slate-400">{new Date(item.criadaEm).toLocaleString('pt-BR')}</time></div></div>
              </button>
            ))}
          </div>
          {paginas > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            <button disabled={pagina <= 1} onClick={() => carregar(pagina - 1)} className="disabled:opacity-40">Anterior</button><span>{pagina} de {paginas}</span><button disabled={pagina >= paginas} onClick={() => carregar(pagina + 1)} className="disabled:opacity-40">Próxima</button>
          </div>}
        </section>
      </>}
    </div>
  );
}
