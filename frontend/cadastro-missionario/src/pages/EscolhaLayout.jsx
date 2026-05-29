import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PERFIS } from '../contexts/AuthContext';

const layouts = [
  {
    id: 'avancado',
    nome: 'Modelo Avançado',
    // descricao: 'Navegação hierárquica completa: Regiões → Distritos → Duplas. Ideal para filtros e relatórios.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
    color: '#1A3A6B',
    gradient: 'from-[#1A3A6B] to-[#2a5298]',
    features: ['Navegação hierárquica', 'Filtros avançados', 'Relatórios detalhados', 'Sidebar completa'],
  },
  {
    id: 'direto',
    nome: 'Modelo Direto',
    // descricao: 'Visualização em cards diretos. Dados acessíveis de forma rápida e objetiva.',
    icon: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    color: '#C9963A',
    gradient: 'from-[#C9963A] to-[#e5b05a]',
    features: ['Cards diretos', 'Master-detail', 'Acesso rápido', 'Visual limpo'],
  },
];

export default function EscolhaLayout() {
  const { setLayout, usuario } = useAuth();
  const navigate = useNavigate();
  const [selecionado, setSelecionado] = useState(null);
  const [hoverCard, setHoverCard] = useState(null);

  const handleEscolher = (layoutId) => {
    setSelecionado(layoutId);
    setLayout(layoutId);
    setTimeout(() => {
      if (layoutId === 'avancado') {
        navigate(usuario?.perfil === PERFIS.PASTOR_DISTRITAL ? '/distritos' : '/regioes');
      } else {
        navigate(usuario?.perfil === PERFIS.PASTOR_DISTRITAL ? '/direto/distritos' : '/direto/regioes');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #0b1a36 0%, #1A3A6B 40%, #162d54 100%)' }}>
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg">
            <img src="/logoiasd.png" alt="Logo IASD" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <p className="text-white font-bold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              Duplas Missionárias
            </p>
            <p className="text-[#C9963A] text-xs font-medium">Assoc. Paulistana</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-xs font-bold">
            {usuario?.nome?.charAt(0)}
          </div>
          <span className="text-white/70 text-sm hidden sm:block">{usuario?.nome}</span>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="max-w-4xl w-full">
          {/* Título */}
          <div className="text-center mb-10 animate-fade-in-down">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#C9963A] animate-pulse" />
              <span className="text-white/80 text-xs font-medium">Escolha sua visualização</span>
            </div>
            {/* <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>
              Como deseja visualizar?
            </h1> */}
          </div>

          {/* Cards de escolha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 stagger-children">
            {layouts.map((layout) => (
              <button
                key={layout.id}
                onClick={() => handleEscolher(layout.id)}
                onMouseEnter={() => setHoverCard(layout.id)}
                onMouseLeave={() => setHoverCard(null)}
                className={`relative text-left rounded-2xl overflow-hidden transition-all duration-300 group ${
                  selecionado === layout.id ? 'ring-2 ring-[#C9963A] scale-[1.02]' : ''
                } ${hoverCard === layout.id ? '-translate-y-2' : ''}`}
              >
                {/* Background com gradiente sutil */}
                <div className="absolute inset-0 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-300" />

                <div className="relative p-6 sm:p-8">
                  {/* Ícone */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${layout.gradient} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    {layout.icon}
                  </div>

                  {/* Nome */}
                  <h2 className="text-xl font-bold text-white mb-2 group-hover:text-[#C9963A] transition-colors duration-200" style={{ fontFamily: 'Georgia, serif' }}>
                    {layout.nome}
                  </h2>

                  {/* Descrição */}
                  <p className="text-white/50 text-sm leading-relaxed mb-5">
                    {layout.descricao}
                  </p>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    {layout.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-[#C9963A] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-white/60 text-xs">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Botão */}
                  <div className={`flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all duration-200`} style={{ color: layout.color === '#1A3A6B' ? '#C9963A' : layout.color }}>
                    <span>Selecionar {layout.nome}</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Indicador de seleção */}
                {selecionado === layout.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#C9963A] flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Nota de rodapé */}
          <p className="text-center text-white/30 text-xs mt-8 animate-fade-in" style={{ animationDelay: '600ms' }}>
            Você pode alternar entre os modelos a qualquer momento pelo menu lateral
          </p>
        </div>
      </div>
    </div>
  );
}
