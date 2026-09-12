import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(
    typeof window !== 'undefined' ? window.__pwaDeferredPrompt : null
  );
  const [isStandalone, setIsStandalone] = useState(false);
  const [deviceType, setDeviceType] = useState('pc'); // 'pc' | 'android' | 'ios'
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pc');
  const [dismissed, setDismissed] = useState(false);
  const [instaladoSucesso, setInstaladoSucesso] = useState(false);

  useEffect(() => {
    // 1. Verifica se já está rodando em modo standalone (PWA instalado e aberto)
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

    // 3. Detecta tipo de dispositivo
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleIos =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(userAgent);

    if (isAppleIos) {
      setDeviceType('ios');
      setActiveTab('ios');
    } else if (isAndroid) {
      setDeviceType('android');
      setActiveTab('android');
    } else {
      setDeviceType('pc');
      setActiveTab('pc');
    }

    // 4. Captura o evento nativo de instalação caso já esteja disponível
    if (window.__pwaDeferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      window.__pwaDeferredPrompt = e;
      setDeferredPrompt(e);
    };

    const handlePromptAvailable = (e) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
      }
    };

    const handleAppInstalled = () => {
      setInstaladoSucesso(true);
      setDeferredPrompt(null);
      window.__pwaDeferredPrompt = null;
      setTimeout(() => {
        setIsStandalone(true);
      }, 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Se já estiver rodando como aplicativo em tela própria, não exibe o banner
  if (isStandalone) {
    return null;
  }

  // Se o usuário dispensou o banner nesta sessão
  if (dismissed && !showGuideModal) {
    return null;
  }

  const handleInstallClick = async () => {
    // Se for iOS, abre direto o guia ilustrado (Safari não suporta prompt programático)
    if (deviceType === 'ios') {
      setActiveTab('ios');
      setShowGuideModal(true);
      return;
    }

    // Se tiver o evento deferredPrompt capturado (Chrome, Edge, Android, etc.)
    const promptEvent = deferredPrompt || window.__pwaDeferredPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult?.outcome === 'accepted') {
          setInstaladoSucesso(true);
        }
        setDeferredPrompt(null);
        window.__pwaDeferredPrompt = null;
        return;
      } catch (err) {
        console.warn('Erro ao abrir prompt nativo:', err);
      }
    }

    // Fallback amigável: se o navegador ainda não disparou o evento ou se o app já está instalado
    setActiveTab(deviceType);
    setShowGuideModal(true);
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

      {/* Modal Interativo de Ajuda / Instruções de Instalação */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-lg w-full border border-gray-100 text-gray-800 relative max-h-[90vh] overflow-y-auto">
            {/* Fechar */}
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0f2347] text-white flex items-center justify-center p-1.5 shadow-md flex-shrink-0">
                <img src="/pwa-192x192.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1A3A6B]">Como Instalar o Aplicativo</h3>
                <p className="text-xs text-gray-500">Acesse sem abrir o navegador e em tela cheia</p>
              </div>
            </div>

            {/* Navegação por Abas (PC, Android, iOS) */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('pc')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'pc' ? 'bg-white text-[#1A3A6B] shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>💻</span> Computador (PC / Mac)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'android' ? 'bg-white text-[#1A3A6B] shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>📱</span> Android
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'ios' ? 'bg-white text-[#1A3A6B] shadow-sm font-bold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>🍏</span> iPhone / iPad
              </button>
            </div>

            {/* Conteúdo Aba: PC */}
            {activeTab === 'pc' && (
              <div className="space-y-3 text-left text-sm">
                <div className="flex items-start gap-3 p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      No Google Chrome ou Edge:
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Clique no menu de <strong>três pontinhos (⋮)</strong> no canto superior direito do navegador.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Selecione &quot;Salvar e compartilhar&quot; ➔ &quot;Instalar...&quot;
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Clique em <strong>&quot;Instalar Programa Capacitação Missionária&quot;</strong> (ou clique no ícone de computador com seta na barra de endereços, se visível).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Confirme a Instalação
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Um atalho será criado automaticamente na sua Área de Trabalho e no Menu Iniciar do Windows.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/70 text-xs text-amber-900 mt-2">
                  <p className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <span>💡</span> Já instalou antes neste computador?
                  </p>
                  <p className="mt-1 text-amber-700 leading-relaxed">
                    Se você já havia instalado, o Chrome não permite instalar duas vezes. Procure por <strong>&quot;Capacitação Missionária&quot;</strong> na busca do Windows ou digite <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-950">chrome://apps</code> na barra do Chrome para abri-lo diretamente!
                  </p>
                </div>
              </div>
            )}

            {/* Conteúdo Aba: Android */}
            {activeTab === 'android' && (
              <div className="space-y-3 text-left text-sm">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Abra o menu do Chrome
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Toque nos <strong>três pontinhos (⋮)</strong> no topo direito da tela.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Selecione &quot;Instalar aplicativo&quot;
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Em alguns modelos, pode aparecer como <strong>&quot;Adicionar à tela inicial&quot;</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Toque em &quot;Instalar&quot;
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      O ícone do app aparecerá junto aos seus outros aplicativos no celular.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo Aba: iOS */}
            {activeTab === 'ios' && (
              <div className="space-y-3 text-left text-sm">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Toque no botão Compartilhar
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Procure pelo ícone quadrado com uma seta para cima na barra inferior do Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Selecione &quot;Adicionar à Tela de Início&quot;
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Role o menu para baixo até encontrar a opção com o ícone de soma (➕).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-7 h-7 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      Confirme em &quot;Adicionar&quot;
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Toque no botão &quot;Adicionar&quot; no canto superior direito para finalizar.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Fechar Modal */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#1A3A6B] to-[#0f2347] text-white font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-md"
              >
                Entendi!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
