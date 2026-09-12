import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [instaladoSucesso, setInstaladoSucesso] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está instalado e rodando em modo standalone (PWA)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // 2. Verifica se o usuário já fechou o banner nesta sessão
    if (sessionStorage.getItem('pwa_banner_dismissed') === 'true') {
      setDismissed(true);
    }

    // 3. Detecta iOS (iPhone, iPad, iPod)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleIos =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isAppleIos) {
      setIsIos(true);
    }

    // 4. Captura o evento nativo de instalação (Chrome, Edge, Brave, Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstaladoSucesso(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        setIsStandalone(true);
      }, 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Se já estiver rodando como aplicativo instalado, não exibe nada
  if (isStandalone) {
    return null;
  }

  // Se o usuário dispensou o banner nesta sessão
  if (dismissed && !showIosModal) {
    return null;
  }

  const handleInstallClick = async () => {
    // Se for iOS, exibe o modal com instrução passo a passo
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    // Se tiver o evento deferredPrompt (Chrome, Edge, Android, etc.)
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult?.outcome === 'accepted') {
        setInstaladoSucesso(true);
      }
      setDeferredPrompt(null);
      return;
    }

    // Fallback: se o navegador não disparou o evento ainda ou não suporta diretamente
    alert(
      'Para instalar este aplicativo:\n\n' +
      '• No Chrome/Edge (PC): Clique no ícone de instalação (computador com seta) na barra de endereços ou no menu (⋮) > "Instalar Aplicativo".\n\n' +
      '• No Celular (Android): Toque no menu (⋮) do navegador e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".'
    );
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return (
    <>
      {/* Banner Superior de Instalação */}
      <div className="w-full bg-gradient-to-r from-[#0a1832] via-[#10274f] to-[#1A3A6B] text-white border-b border-[#C9963A]/30 shadow-lg relative z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Lado Esquerdo: Ícone e Texto */}
          <div className="flex items-center gap-3 w-full sm:w-auto text-left">
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0f2347] to-[#1A3A6B] border border-[#C9963A]/40 flex items-center justify-center shadow-md overflow-hidden p-1">
                <img
                  src="/pwa-192x192.png"
                  alt="App Icon"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/logoiasd.png';
                  }}
                />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C9963A] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#C9963A]"></span>
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                  {instaladoSucesso ? '🎉 Aplicativo Instalado!' : 'Instalar Aplicativo'}
                </p>
                <span className="hidden md:inline-flex text-[10px] font-semibold bg-[#C9963A]/25 text-amber-200 border border-[#C9963A]/40 px-2 py-0.2 rounded-full uppercase tracking-wider">
                  PC • Celular • Tablet
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/80 line-clamp-1">
                {instaladoSucesso
                  ? 'Você já pode acessar o sistema direto da sua tela inicial ou área de trabalho.'
                  : 'Acesse mais rápido em tela cheia com 1 clique direto no seu dispositivo.'}
              </p>
            </div>
          </div>

          {/* Lado Direito: Botão de Ação e Fechar */}
          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            {!instaladoSucesso ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#C9963A] to-[#d4a34b] hover:from-[#b8852c] hover:to-[#c9963a] text-slate-950 font-bold text-xs sm:text-sm shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.2}
                  stroke="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                <span>Instalar Aplicativo</span>
              </button>
            ) : (
              <span className="text-xs text-green-300 font-semibold px-3 py-1.5 bg-green-950/40 border border-green-500/30 rounded-lg flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Instalado
              </span>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              title="Dispensar aviso"
              className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Modal especial de Instruções para Usuários do iOS (iPhone / iPad) */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-md w-full border border-gray-100 text-gray-800 relative">
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0f2347] text-white flex items-center justify-center p-1.5 shadow-md">
                <img src="/pwa-192x192.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1A3A6B]">Como instalar no iPhone / iPad</h3>
                <p className="text-xs text-gray-500">Adicione à tela inicial em 3 passos simples</p>
              </div>
            </div>

            {/* Passos */}
            <div className="space-y-3.5 my-5 text-left text-sm">
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    Toque no botão Compartilhar
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    Procure pelo ícone quadrado com uma seta para cima
                    <span className="inline-block p-1 bg-gray-200 rounded text-gray-700">
                      <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </span>
                    na barra do Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    Selecione &quot;Adicionar à Tela de Início&quot;
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Role a lista de opções para baixo até encontrar o item com o ícone de soma (➕).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-gray-800">
                    Toque em &quot;Adicionar&quot;
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    No canto superior direito da tela, confirme clicando em Adicionar.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer"
            >
              Entendi!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
