import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth, PERFIS } from '../contexts/AuthContext';
import DropdownMenu from './DropdownMenu';

const icons = {
  regioes: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
    </svg>
  ),
  distritos: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  igrejas: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M12 3v8m0 0l-3-3m3 3l3-3" />
    </svg>
  ),
  duplas: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  cadastro: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  menu: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  trocaLayout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  relatorios: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
};

const perfilLabel = {
  SUPER_ADMIN: 'Super Administrador',
  ADMINISTRADOR: 'Administrador',
  PASTOR_REGIONAL: 'Pastor Departamental Regional',
  COORDENADOR_REGIONAL: 'Coordenador Regional',
  PASTOR_DISTRITAL: 'Pastor Distrital',
  DIRETOR_MISSIONARIO_IGREJA: 'Diretor Missionário',
  LIDER_REGIOES: 'Líder de Regiões',
};

const formatarNomeUsuario = (nome) => (
  nome?.replace(/^Pastor Regional - REGIÃO/i, 'Pr. Dp. Regional - REGIÃO')
);

export default function LayoutDireto() {
  const { usuario, logout, setLayout } = useAuth();
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTrocarLayout = () => {
    setLayout('avancado');
    if ([PERFIS.DUPLA_MISSIONARIA, PERFIS.DIRETOR_MISSIONARIO_IGREJA].includes(usuario?.perfil)) {
      navigate('/igrejas');
      return;
    }
    navigate(usuario?.perfil === PERFIS.PASTOR_DISTRITAL ? '/distritos' : '/regioes');
  };

  const isAdmin = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(usuario?.perfil);
  const isDupla = usuario?.perfil === PERFIS.DUPLA_MISSIONARIA;
  const isDiretorMissionario = usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA;
  const isCoordenadorRegional = usuario?.perfil === PERFIS.COORDENADOR_REGIONAL;
  const isPastorDistrital = usuario?.perfil === PERFIS.PASTOR_DISTRITAL;

  const cadastroItems = [
    { to: '/direto/duplas/nova', label: 'Nova Dupla', icon: '+' },
    { to: '/direto/cadastro/estudos-biblicos', label: 'Estudos Bíblicos', icon: '📖' },
    { to: '/direto/cadastro/ponto-estudo', label: 'Ponto de Estudo', icon: 'PE' },
    { to: '/direto/cadastro/classe-biblica', label: 'Classe Bíblica', icon: 'CB' },
    { to: '/direto/cadastro/escola-sabatina', label: 'Escola Sabatina', icon: 'ES' },
    { to: '/direto/cadastro/liderancas?tipo=diretor_mp', label: 'Diretor Minist. Pessoal', icon: 'MP' },
    { to: '/direto/cadastro/liderancas?tipo=distrital', label: 'Pastor Distrital', icon: 'PD' },
    { to: '/direto/cadastro/liderancas?tipo=coordenador', label: 'Coordenador Regional', icon: 'CR' },
    { to: '/direto/cadastro/liderancas?tipo=igreja', label: 'Dados da Igreja', icon: 'IG' },
    { to: '/direto/registro-saida', label: 'Registro de Assistência (Coor. Reg.)', icon: '✅' },
    { to: '/direto/cadastro/liderancas', label: 'Lideranças', icon: '🏅' },
    ...(isAdmin ? [{ to: '/direto/gestao-usuarios', label: 'Gestão de Usuários', icon: 'GU' }] : []),
  ];

  const relatorioItems = [
    { to: '/direto/relatorios', label: 'Geral', icon: '📊' },
    { to: '/direto/relatorios/dashboard-associacao', label: 'Assoc. Paulistana', icon: 'AP' },
    ...(isAdmin ? [{ to: '/direto/relatorios/personalizado', label: 'Relatório Personalizado', icon: 'RP' }] : []),
    { to: '/direto/relatorios/estudos-biblicos', label: 'Estudantes Bíblicos', icon: '📖' },
    { to: '/direto/relatorios/pontos-estudo', label: 'Pontos de Estudo', icon: 'PE' },
    { to: '/direto/relatorios/classes-biblicas', label: 'Classes Bíblicas', icon: 'CB' },
    { to: '/direto/relatorios/coordenador-regional', label: 'Coordenador Regional', icon: 'CR' },
  ];
  const relatorioItemsVisiveis = isCoordenadorRegional
    ? relatorioItems.filter((item) => (
      item.to.includes('/relatorios/estudos-biblicos') ||
      item.to.includes('/relatorios/pontos-estudo') ||
      item.to.includes('/relatorios/classes-biblicas')
    ))
    : relatorioItems;

  const cadastroItemsVisiveis = isDiretorMissionario
    ? cadastroItems.filter((item) => [
      '/direto/duplas/nova',
      '/direto/cadastro/estudos-biblicos',
      '/direto/cadastro/ponto-estudo',
      '/direto/cadastro/classe-biblica',
      '/direto/cadastro/escola-sabatina',
      '/direto/cadastro/liderancas?tipo=diretor_mp',
    ].includes(item.to))
    : cadastroItems;

  const navLinks = isDupla ? [
    { to: '/direto/igrejas', label: 'Minha Igreja', shortLabel: 'Minha Igr.', icon: icons.igrejas },
    { to: '/direto/duplas', label: 'Duplas', shortLabel: 'Dup.', icon: icons.duplas },
    { type: 'dropdown', key: 'cadastro', label: 'Cadastro', shortLabel: 'Cad.', icon: icons.cadastro, items: [
      { to: '/direto/cadastro/estudos-biblicos', label: 'Estudos Bíblicos', icon: '📖' },
      { to: '/direto/cadastro/ponto-estudo', label: 'Ponto de Estudo', icon: 'PE' },
      { to: '/direto/cadastro/classe-biblica', label: 'Classe Bíblica', icon: 'CB' },
    ] },
    { type: 'dropdown', key: 'relatorios', label: 'Relatórios', shortLabel: 'Rel.', icon: icons.relatorios, items: [
      { to: '/direto/relatorios/estudos-biblicos', label: 'Estudantes Bíblicos', icon: '📖' },
      { to: '/direto/relatorios/pontos-estudo', label: 'Pontos de Estudo', icon: 'PE' },
      { to: '/direto/relatorios/classes-biblicas', label: 'Classes Bíblicas', icon: 'CB' },
    ] },
  ] : isDiretorMissionario ? [
    { to: '/direto/igrejas', label: 'Minha Igreja', shortLabel: 'Minha Igr.', icon: icons.igrejas },
    { to: '/direto/duplas', label: 'Duplas', shortLabel: 'Dup.', icon: icons.duplas },
    { type: 'dropdown', key: 'cadastro', label: 'Cadastro', shortLabel: 'Cad.', icon: icons.cadastro, items: cadastroItemsVisiveis },
  ] : [
    ...(!isPastorDistrital ? [{ to: '/direto/regioes', label: 'Regiões', shortLabel: 'Reg.', icon: icons.regioes }] : []),
    { to: '/direto/distritos', label: 'Distritos', shortLabel: 'Dist.', icon: icons.distritos },
    { to: '/direto/igrejas', label: 'Igrejas', shortLabel: 'Igrej.', icon: icons.igrejas },
    { to: '/direto/duplas', label: 'Duplas', shortLabel: 'Dup.', icon: icons.duplas },
    { type: 'dropdown', key: 'cadastro', label: 'Cadastro', shortLabel: 'Cad.', icon: icons.cadastro, items: cadastroItemsVisiveis },
    { type: 'dropdown', key: 'relatorios', label: 'Relatórios', shortLabel: 'Rel.', icon: icons.relatorios, items: relatorioItemsVisiveis },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F4F5F7]">
      {/* Header superior compacto */}
      <header
        className="flex-shrink-0 shadow-md z-30"
        style={{ background: 'linear-gradient(135deg, #0f2347 0%, #1A3A6B 100%)' }}
      >
        <div className="px-4 sm:px-6">
          <div className="flex items-center h-14 gap-3 lg:gap-6 min-w-0">
            {/* Logo + Título */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0">
                <img src="/logoiasd.png" alt="Logo IASD" className="w-full h-full object-contain p-0.5" />
              </div>
              <div className="hidden sm:block">
                <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                  PCM
                </p>
                <p className="text-[#C9963A] text-[10px] font-medium">Assoc. Paulistana</p>
              </div>
            </div>

            {/* Navegação desktop — centro */}
            <nav className="hidden lg:flex flex-1 min-w-0 items-center gap-1 overflow-visible py-1 pr-1">
              {navLinks.map((link) => link.type === 'dropdown' ? (
                <DropdownMenu
                  key={link.key}
                  label={link.label}
                  shortLabel={link.shortLabel}
                  icon={link.icon}
                  items={link.items}
                  align={link.key === 'relatorios' ? 'right' : 'left'}
                />
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex flex-shrink-0 items-center gap-1.5 xl:gap-2 px-2 lg:px-2.5 xl:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    }`
                  }
                >
                  {link.icon}
                  <span className="hidden xl:inline">{link.label}</span>
                  <span className="xl:hidden">{link.shortLabel || link.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Ações à direita */}
            <div className="flex flex-shrink-0 items-center gap-2 lg:ml-2 xl:ml-4">
              {/* Indicador do modelo */}
              <div className="hidden 2xl:flex items-center gap-2 bg-[#C9963A]/15 border border-[#C9963A]/20 rounded-lg px-3 py-1.5 mr-1">
                <div className="w-2 h-2 rounded-full bg-[#C9963A]" />
                <span className="text-[#C9963A] text-[10px] font-semibold uppercase tracking-wider">
                  Modelo Direto
                </span>
              </div>

              {/* Botão trocar layout */}
              <button
                type="button"
                onClick={handleTrocarLayout}
                className="hidden lg:flex items-center gap-2 text-white/50 hover:text-[#C9963A] text-xs font-medium px-2 lg:px-3 py-2 rounded-lg hover:bg-white/8 transition-all duration-200"
                title="Trocar para modo Avançado"
              >
                {icons.trocaLayout}
                <span className="hidden xl:inline">Modo Avançado</span>
              </button>

              {/* Usuário */}
              <div className="hidden lg:flex items-center gap-2 bg-white/8 rounded-lg px-3 py-1.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  {usuario?.nome?.charAt(0)}
                </div>
                <div className="hidden lg:block">
                  <p className="text-white text-xs font-semibold leading-tight">{formatarNomeUsuario(usuario?.nome)}</p>
                  <p className="text-white/40 text-[10px]">{perfilLabel[usuario?.perfil]}</p>
                </div>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="text-white/40 hover:text-red-300 p-2 rounded-lg hover:bg-white/8 transition-all duration-200"
                title="Sair"
              >
                {icons.logout}
              </button>

              {/* Menu mobile */}
              <button
                type="button"
                onClick={() => setMenuAberto(!menuAberto)}
                className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {icons.menu}
              </button>
            </div>
          </div>
        </div>

        {/* Menu compacto para celular/tablet */}
        {menuAberto && (
          <div className="lg:hidden border-t border-white/10 bg-[#0f2347] animate-fade-in" style={{ maxHeight: 'calc(100vh - 56px)', overflowY: 'auto' }}>
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => link.type === 'dropdown' ? (
                <div key={link.key}>
                  <button
                    type="button"
                    onClick={() => setMobileSubmenu(mobileSubmenu === link.key ? null : link.key)}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 w-full transition-all duration-200"
                  >
                    <span className="flex items-center gap-3">{link.icon}{link.label}</span>
                    <svg className={`w-4 h-4 transition-transform ${mobileSubmenu === link.key ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {mobileSubmenu === link.key && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {link.items.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => { setMenuAberto(false); setMobileSubmenu(null); }}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/8"
                        >
                          <span className="flex-shrink-0 w-5 text-center text-xs">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/8'
                    }`
                  }
                >
                  {link.icon}
                  {link.label}
                </NavLink>
              ))}

              <div className="border-t border-white/10 pt-2 mt-2">
                <button
                  type="button"
                  onClick={handleTrocarLayout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#C9963A]/70 hover:text-[#C9963A] hover:bg-[#C9963A]/10 w-full transition-all duration-200"
                >
                  {icons.trocaLayout}
                  Trocar para Avançado
                </button>
              </div>

              {/* Info usuário mobile */}
              <div className="bg-white/5 rounded-xl p-3 mt-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {usuario?.nome?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{formatarNomeUsuario(usuario?.nome)}</p>
                    <p className="text-white/50 text-xs">{perfilLabel[usuario?.perfil]}</p>
                  </div>
                </div>
                {usuario?.regiao && (
                  <p className="text-[#C9963A] text-xs mt-2 pl-10">📍 {usuario.regiao.nome}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Conteúdo principal — ocupa todo o resto da tela, sem scroll vertical global */}
      <main className="direto-main-content flex-1 min-h-0 overflow-y-auto pb-20 lg:pb-0">
        <Outlet />
      </main>
      <BottomNavigation navLinks={navLinks} onMenuClick={() => setMenuAberto(true)} />
    </div>
  );
}

function BottomNavigation({ navLinks, onMenuClick }) {
  const principais = navLinks
    .filter((link) => !link.type)
    .slice(0, 3);

  return (
    <nav className="lg:hidden fixed left-0 right-0 bottom-0 z-30 mobile-bottom-nav direto-bottom-nav border-t border-gray-200 bg-white/95 px-2 pt-2 backdrop-blur">
      <div className="grid grid-cols-4 gap-1">
        {principais.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `mobile-bottom-nav-link ${isActive ? 'bg-[#1A3A6B] text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1A3A6B]'}`
            }
          >
            {link.icon}
            <span className="max-w-full truncate">{link.shortLabel || link.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMenuClick}
          className="mobile-bottom-nav-link text-gray-500 hover:bg-gray-50 hover:text-[#1A3A6B]"
        >
          {icons.menu}
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
