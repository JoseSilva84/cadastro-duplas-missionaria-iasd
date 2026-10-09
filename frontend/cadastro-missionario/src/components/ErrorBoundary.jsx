import React from 'react';
import api from '../lib/api';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturou um erro não tratado:', error, errorInfo);
    api.post('/auditoria/cliente', {
      tipo: 'ERRO_FRONTEND',
      pagina: window.location.pathname,
      descricao: error?.message || 'Erro crítico ao renderizar a página.',
      detalhes: { erro: error?.stack, componentes: errorInfo?.componentStack },
    }).catch(() => {});
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C9963A]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="text-xl font-black text-[#1A3A6B] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              Algo inesperado aconteceu
            </h2>

            <p className="text-sm text-slate-600 mb-6">
              Ocorreu uma instabilidade momentânea ao carregar esta área do sistema.
            </p>

            {this.state.error && (
              <div className="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-auto max-h-32 text-xs font-mono text-slate-700">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 px-4 py-2.5 bg-[#1A3A6B] hover:bg-[#152e55] text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Recarregar Página
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Ir para o Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
