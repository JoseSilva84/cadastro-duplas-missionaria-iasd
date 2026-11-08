import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export const normalizarWhatsApp = (numero) => {
  const digitos = String(numero || '').replace(/\D/g, '');
  if (!digitos) return '';
  const semDdi = digitos.length >= 12 && digitos.startsWith('55') ? digitos.slice(2) : digitos;
  if (semDdi.length < 10 || /^0+$/.test(semDdi)) return '';
  return semDdi;
};

export const temWhatsAppValido = (numero) => Boolean(normalizarWhatsApp(numero));

export const formatarWhatsApp = (numero) => {
  const limpo = normalizarWhatsApp(numero);
  if (!limpo) return String(numero || '');
  if (limpo.length === 11) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  }
  if (limpo.length === 10) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  }
  return limpo;
};

export const WhatsAppSvg = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

/**
 * Botão pequeno e arredondado do WhatsApp.
 * Só renderiza se o telefone for um número válido.
 */
export function WhatsAppIconButton({
  numero,
  nome,
  onClick,
  size = 'sm',
  className = '',
  mostrarNumero = false,
}) {
  if (!temWhatsAppValido(numero)) return null;

  const numeroFormatado = formatarWhatsApp(numero);
  const dimensaoPx = size === 'xs' ? 20 : size === 'md' ? 26 : 22;
  const iconeClasses = size === 'xs'
    ? 'w-3 h-3'
    : size === 'md'
      ? 'w-4 h-4'
      : 'w-3.5 h-3.5';

  const handleClick = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (onClick) onClick(event);
  };

  if (mostrarNumero) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title={`Enviar mensagem no WhatsApp para ${nome || numeroFormatado} (${numeroFormatado})`}
        style={{ minHeight: '24px', height: 'auto', paddingTop: '2px', paddingBottom: '2px' }}
        className={`!min-h-0 inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/10 px-2 py-0.5 text-xs font-semibold text-[#16a34a] border border-[#25D366]/30 transition-all hover:bg-[#25D366] hover:text-white hover:shadow-sm active:scale-95 ${className}`}
      >
        <span
          className="inline-flex items-center justify-center rounded-full bg-[#25D366] text-white flex-shrink-0"
          style={{ width: '16px', height: '16px', minWidth: '16px', minHeight: '16px' }}
        >
          <WhatsAppSvg className="w-2.5 h-2.5" />
        </span>
        <span className="truncate leading-none">{numeroFormatado}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Enviar mensagem no WhatsApp para ${nome || 'contato'} (${numeroFormatado})`}
      aria-label={`Enviar mensagem no WhatsApp para ${nome || numeroFormatado}`}
      style={{
        width: `${dimensaoPx}px`,
        height: `${dimensaoPx}px`,
        minWidth: `${dimensaoPx}px`,
        minHeight: `${dimensaoPx}px`,
        maxHeight: `${dimensaoPx}px`,
        padding: 0,
        lineHeight: 1,
      }}
      className={`!min-h-0 inline-flex flex-shrink-0 aspect-square items-center justify-center rounded-full bg-[#25D366] text-white shadow-xs ring-1 ring-white transition-all duration-200 hover:scale-110 hover:bg-[#1ebe5d] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#25D366]/50 active:scale-95 ${className}`}
    >
      <WhatsAppSvg className={iconeClasses} />
    </button>
  );
}

const primeiroNome = (nomeCompleto) => {
  const limpo = String(nomeCompleto || '').trim();
  if (!limpo) return '';
  const parte = limpo.split(/\s+/)[0];
  return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
};

const gerarSugestoes = (destinatario) => {
  const nome = primeiroNome(destinatario?.nome);
  const saudacaoNome = nome ? `Olá, ${nome}!` : 'Olá!';

  if (destinatario?.tipo === 'ALUNO') {
    return [
      `${saudacaoNome} Tudo bem? Que Deus abençoe seu dia! Estou passando para falar sobre o nosso estudo bíblico.`,
      `${saudacaoNome} Paz seja convosco! Passando para confirmar o nosso próximo encontro do estudo bíblico.`,
      `${saudacaoNome} Como você está? Estamos orando por você e sua família!`,
    ];
  }

  return [
    `${saudacaoNome} Paz seja convosco! Tudo bem com você e sua dupla missionária?`,
    `${saudacaoNome} Passando para acompanhar como estão os estudos bíblicos e visitações da sua dupla.`,
    `${saudacaoNome} Que Deus abençoe seu ministério! Precisando de apoio ou materiais para os estudos, conte conosco.`,
  ];
};

export default function WhatsAppMensagemModal({ destinatario, onClose }) {
  const [mensagem, setMensagem] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!destinatario) return;
    const sugestoes = gerarSugestoes(destinatario);
    setMensagem(sugestoes[0] || '');
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [destinatario]);

  useEffect(() => {
    if (!destinatario) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [destinatario, onClose]);

  if (!destinatario) return null;

  const numeroLimpo = normalizarWhatsApp(destinatario.numero);
  const numeroFormatado = formatarWhatsApp(destinatario.numero);
  const sugestoes = gerarSugestoes(destinatario);

  const enviarWhatsApp = (modo = 'auto') => {
    if (!numeroLimpo) return;
    const textoCodificado = encodeURIComponent(mensagem.trim());
    const ddiNumero = `55${numeroLimpo}`;
    const ehMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    const url = (modo === 'app' || (modo === 'auto' && ehMobile))
      ? `https://api.whatsapp.com/send?phone=${ddiNumero}${textoCodificado ? `&text=${textoCodificado}` : ''}`
      : `https://web.whatsapp.com/send?phone=${ddiNumero}${textoCodificado ? `&text=${textoCodificado}` : ''}`;

    window.open(url, '_blank', 'noopener,noreferrer');
    onClose?.();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    enviarWhatsApp('auto');
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 animate-scale-in flex flex-col max-h-[92vh]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1A3A6B] via-[#1f457e] to-[#1A3A6B] px-5 py-4 text-white relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            style={{ width: '32px', height: '32px', minHeight: '32px', minWidth: '32px', padding: 0 }}
            className="!min-h-0 absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition"
            title="Fechar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm">
              <WhatsAppSvg className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#25D366]">
              Enviar mensagem via WhatsApp
            </span>
          </div>

          <h3 className="mt-1.5 text-base sm:text-lg font-bold truncate pr-8" style={{ fontFamily: 'Georgia, serif' }}>
            {destinatario.nome || 'Destinatário'}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 font-semibold text-white">
              📱 {numeroFormatado}
            </span>
            {destinatario.subtitulo && (
              <span className="truncate text-white/75">{destinatario.subtitulo}</span>
            )}
          </div>
        </div>

        {/* Corpo */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Sugestões rápidas */}
          <div>
            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Sugestões rápidas (clique para usar):
            </span>
            <div className="flex flex-col gap-1.5">
              {sugestoes.map((sugestao, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setMensagem(sugestao);
                    textareaRef.current?.focus();
                  }}
                  className={`text-left text-xs px-3 py-2 rounded-xl border transition-all line-clamp-2 ${
                    mensagem === sugestao
                      ? 'border-[#25D366] bg-[#25D366]/10 text-[#1A3A6B] font-semibold'
                      : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200 hover:bg-gray-100/70'
                  }`}
                >
                  {sugestao}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="whatsapp-mensagem-input" className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Sua mensagem
              </label>
              {mensagem && (
                <button
                  type="button"
                  onClick={() => {
                    setMensagem('');
                    textareaRef.current?.focus();
                  }}
                  className="text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
                >
                  Limpar texto
                </button>
              )}
            </div>
            <textarea
              id="whatsapp-mensagem-input"
              ref={textareaRef}
              rows={4}
              value={mensagem}
              onChange={(event) => setMensagem(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault();
                  enviarWhatsApp('auto');
                }
              }}
              placeholder="Digite aqui a mensagem que deseja enviar..."
              className="input-field min-h-[104px] resize-y text-sm leading-relaxed"
            />
          </div>

          {/* Aviso sobre WhatsApp Web */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-2.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366]/20 text-[#16a34a] flex-shrink-0 mt-0.5">
              <WhatsAppSvg className="w-3 h-3" />
            </span>
            <p className="leading-relaxed">
              O envio abrirá o <strong>WhatsApp Web</strong> no seu computador (certifique-se de estar com o WhatsApp conectado) já com a conversa e a mensagem preenchidas.
            </p>
          </div>

          {/* Botões */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline px-4 py-2 text-xs sm:text-sm"
            >
              Cancelar
            </button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                type="submit"
                disabled={!numeroLimpo}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:bg-[#1ebe5d] hover:shadow-lg disabled:opacity-50"
              >
                <WhatsAppSvg className="w-4 h-4" />
                <span>Abrir no WhatsApp Web</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
}
