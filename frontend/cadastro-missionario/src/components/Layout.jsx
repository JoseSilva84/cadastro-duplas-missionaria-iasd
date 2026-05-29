import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth, PERFIS, ehAdmin } from '../contexts/AuthContext';

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
  relatorios: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  usuarios: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  menu: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  logoIasd: (
    <div className="w-9 h-9 flex items-center justify-center rounded-lg flex-shrink-0">
      <img src="/logoiasd.png" alt="Logo IASD" className="w-full h-full object-contain p-0.5" />
    </div>
  ),
  trocaLayout: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
};

const perfilLabel = {
  SUPER_ADMIN: 'Super Administrador',
  ADMINISTRADOR: 'Administrador (MIPES)',
  PASTOR_REGIONAL: 'Pastor Departamental Regional',
  COORDENADOR_REGIONAL: 'Coordenador Regional',
  PASTOR_DISTRITAL: 'Pastor Distrital',
  DUPLA_MISSIONARIA: 'Dupla Missionária',
};

const formatarNomeUsuario = (nome) => (
  nome?.replace(/^Pastor Regional - REGIÃO/i, 'Pr. Dp. Regional - REGIÃO')
);

export default function Layout({ children }) {
  const { usuario, logout, layout, setLayout } = useAuth();
  const navigate = useNavigate();
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleTrocarLayout = () => {
    const novoLayout = layout === 'avancado' ? 'direto' : 'avancado';
    const destinoDupla = novoLayout === 'avancado' ? '/igrejas' : '/direto/igrejas';
    setLayout(novoLayout);
    if (usuario?.perfil === PERFIS.DUPLA_MISSIONARIA) {
      navigate(destinoDupla);
      return;
    }
    if (usuario?.perfil === PERFIS.PASTOR_DISTRITAL) {
      navigate(novoLayout === 'avancado' ? '/distritos' : '/direto/distritos');
      return;
    }
    if (novoLayout === 'avancado') {
      navigate('/regioes');
    } else {
      navigate('/direto/regioes');
    }
  };

  const isAdmin = ehAdmin(usuario); // SUPER_ADMIN + ADMINISTRADOR
  const isSuperAdmin = usuario?.perfil === PERFIS.SUPER_ADMIN;
  const isDupla = usuario?.perfil === PERFIS.DUPLA_MISSIONARIA;
  const isCoordenadorRegional = usuario?.perfil === PERFIS.COORDENADOR_REGIONAL;
  const isPastorDistrital = usuario?.perfil === PERFIS.PASTOR_DISTRITAL;
  const podeGerenciarLiderancas = isAdmin || [PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil);
  const podeVerRelatorios = isAdmin || isDupla || [PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil);
  const podeCadastrarDupla = !isDupla;
  const isDireto = layout === 'direto';

  const navLinks = isDupla
    ? [
        { to: isDireto ? '/direto/igrejas' : '/igrejas', label: 'Minha Igreja', icon: icons.igrejas },
        { type: 'dropdown', key: 'cadastro', label: 'Cadastro', icon: icons.cadastro, items: [
          { to: '/cadastro/estudos-biblicos', label: 'Estudos Bíblicos', icon: '📖' },
          { to: '/cadastro/ponto-estudo', label: 'Ponto de Estudo', icon: 'PE' },
          { to: '/cadastro/classe-biblica', label: 'Classe Bíblica', icon: 'CB' },
        ] },
        { type: 'dropdown', key: 'relatorios', label: 'Relatórios', icon: icons.relatorios, items: [
          { to: '/relatorios/estudos-biblicos', label: 'Estudantes Bíblicos', icon: '📖' },
          { to: '/relatorios/pontos-estudo', label: 'Pontos de Estudo', icon: 'PE' },
          { to: '/relatorios/classes-biblicas', label: 'Classes Bíblicas', icon: 'CB' },
        ] },
      ]
    : isDireto
    ? [
        ...(!isPastorDistrital ? [{ to: '/direto/regioes', label: 'Regiões', icon: icons.regioes }] : []),
        { to: '/direto/distritos', label: 'Distritos', icon: icons.distritos },
        { to: '/direto/igrejas', label: 'Igrejas', icon: icons.igrejas },
        { to: '/direto/duplas', label: 'Duplas', icon: icons.duplas },
        { type: 'dropdown', key: 'cadastro', label: 'Cadastro', icon: icons.cadastro, items: [
          ...(podeCadastrarDupla ? [{ to: '/direto/duplas/nova', label: 'Nova Dupla', icon: '+' }] : []),
          { to: '/direto/cadastro/estudos-biblicos', label: 'Estudos Bíblicos', icon: '📖' },
          { to: '/direto/cadastro/ponto-estudo', label: 'Ponto de Estudo', icon: 'PE' },
          { to: '/direto/cadastro/classe-biblica', label: 'Classe Bíblica', icon: 'CB' },
          { to: '/direto/cadastro/escola-sabatina', label: 'Escola Sabatina', icon: 'ES' },
          ...(podeGerenciarLiderancas ? [
            { to: '/direto/cadastro/liderancas?tipo=diretor_mp', label: 'Diretor Minist. Pessoal', icon: 'MP' },
            { to: '/direto/cadastro/liderancas?tipo=distrital', label: 'Pastor Distrital', icon: 'PD' },
            { to: '/direto/cadastro/liderancas?tipo=coordenador', label: 'Coordenador Regional', icon: 'CR' },
            { to: '/direto/cadastro/liderancas?tipo=igreja', label: 'Dados da Igreja', icon: 'IG' },
            { to: '/direto/cadastro/liderancas', label: 'Lideranças', icon: '🏅' },
          ] : []),
          ...(isAdmin ? [{ to: '/direto/gestao-usuarios', label: 'Gestão de Usuários', icon: 'GU' }] : []),
          { to: '/direto/registro-saida', label: 'Registro de Assistência (Coor. Reg.)', icon: '✅' },
        ] },
        ...(podeVerRelatorios ? [{ type: 'dropdown', key: 'relatorios', label: 'Relatórios', icon: icons.relatorios, items: [
          { to: '/direto/relatorios', label: 'Geral', icon: '📊' },
          { to: '/direto/relatorios/dashboard-associacao', label: 'Assoc. Paulistana', icon: 'AP' },
          { to: '/direto/relatorios/estudos-biblicos', label: 'Estudantes Bíblicos', icon: '📖' },
          { to: '/direto/relatorios/pontos-estudo', label: 'Pontos de Estudo', icon: 'PE' },
          { to: '/direto/relatorios/classes-biblicas', label: 'Classes Bíblicas', icon: 'CB' },
          { to: '/direto/relatorios/coordenador-regional', label: 'Coordenador Regional', icon: 'CR' },
        ] }] : []),
      ]
    : [
        ...(!isPastorDistrital ? [{ to: '/regioes', label: 'Regiões', icon: icons.regioes }] : []),
        { to: '/distritos', label: 'Distritos', icon: icons.distritos },
        { to: '/igrejas', label: 'Igrejas', icon: icons.igrejas },
        { to: '/duplas', label: 'Duplas', icon: icons.duplas },
        { type: 'dropdown', key: 'cadastro', label: 'Cadastro', icon: icons.cadastro, items: [
          ...(podeCadastrarDupla ? [{ to: '/duplas/nova', label: 'Nova Dupla', icon: '+' }] : []),
          { to: '/cadastro/estudos-biblicos', label: 'Estudos Bíblicos', icon: '📖' },
          { to: '/cadastro/ponto-estudo', label: 'Ponto de Estudo', icon: 'PE' },
          { to: '/cadastro/classe-biblica', label: 'Classe Bíblica', icon: 'CB' },
          { to: '/cadastro/escola-sabatina', label: 'Escola Sabatina', icon: 'ES' },
          ...(podeGerenciarLiderancas ? [
            { to: '/cadastro/liderancas?tipo=diretor_mp', label: 'Diretor Minist. Pessoal', icon: 'MP' },
            { to: '/cadastro/liderancas?tipo=distrital', label: 'Pastor Distrital', icon: 'PD' },
            { to: '/cadastro/liderancas?tipo=coordenador', label: 'Coordenador Regional', icon: 'CR' },
            { to: '/cadastro/liderancas?tipo=igreja', label: 'Dados da Igreja', icon: 'IG' },
            { to: '/cadastro/liderancas', label: 'Lideranças', icon: '🏅' },
          ] : []),
          ...(isAdmin ? [{ to: '/gestao-usuarios', label: 'Gestão de Usuários', icon: 'GU' }] : []),
          { to: '/registro-saida', label: 'Registro de Assistência (Coor. Reg.)', icon: '✅' },
        ] },
        ...(podeVerRelatorios ? [{ type: 'dropdown', key: 'relatorios', label: 'Relatórios', icon: icons.relatorios, items: [
          { to: '/relatorios', label: 'Geral', icon: '📊' },
          { to: '/relatorios/dashboard-associacao', label: 'Assoc. Paulistana', icon: 'AP' },
          { to: '/relatorios/estudos-biblicos', label: 'Estudantes Bíblicos', icon: '📖' },
          { to: '/relatorios/pontos-estudo', label: 'Pontos de Estudo', icon: 'PE' },
          { to: '/relatorios/classes-biblicas', label: 'Classes Bíblicas', icon: 'CB' },
          { to: '/relatorios/coordenador-regional', label: 'Coordenador Regional', icon: 'CR' },
        ] }] : []),
      ];

  const navLinksVisiveis = isCoordenadorRegional
    ? navLinks.map((link) => {
      if (link.key === 'relatorios') {
        return {
          ...link,
          items: link.items.filter((item) => (
            item.to.includes('/relatorios/estudos-biblicos') ||
            item.to.includes('/relatorios/pontos-estudo') ||
            item.to.includes('/relatorios/classes-biblicas')
          )),
        };
      }
      return link;
    })
    : navLinks;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #0b1a36 0%, #1A3A6B 40%, #162d54 100%)' }}
      >
        <SidebarContent
          usuario={usuario}
          navLinks={navLinksVisiveis}
          handleLogout={handleLogout}
          handleTrocarLayout={handleTrocarLayout}
          setSidebarAberta={setSidebarAberta}
          layout={layout}
        />
      </aside>

       {/* Sidebar mobile */}
       <div className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${sidebarAberta ? 'pointer-events-auto' : 'pointer-events-none'}`}>
         <div
           className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${sidebarAberta ? 'opacity-100' : 'opacity-0'}`}
           onClick={() => setSidebarAberta(false)}
         />
         <aside
           className={`absolute left-0 top-0 bottom-0 w-[280px] max-w-[80vw] flex flex-col z-50 transition-transform duration-300 ease-out ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}`}
           style={{ background: 'linear-gradient(180deg, #0b1a36 0%, #1A3A6B 40%, #162d54 100%)' }}
         >
           <SidebarContent
             usuario={usuario}
             navLinks={navLinksVisiveis}
             handleLogout={handleLogout}
             handleTrocarLayout={handleTrocarLayout}
             setSidebarAberta={setSidebarAberta}
             layout={layout}
           />
         </aside>
       </div>

       {/* Conteúdo principal */}
       <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
         {/* Header mobile */}
         <header className="lg:hidden flex items-center justify-between px-3 py-3 shadow-md gap-2"
           style={{ background: 'linear-gradient(135deg, #0f2347 0%, #1A3A6B 100%)' }}
         >
           <button
             type="button"
             onClick={() => setSidebarAberta(true)}
             className="text-white p-3 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
           >
             {icons.menu}
           </button>
           <div className="flex items-center gap-2 min-w-0 flex-1 justify-center">
             {icons.logoIasd}
             <span className="text-white text-xs sm:text-sm font-bold truncate" style={{ fontFamily: 'Georgia, serif' }}>
               Duplas Missionárias
             </span>
           </div>
           <div className="w-9 flex-shrink-0" />
         </header>

         <main className="flex-1 overflow-y-auto bg-[#F4F5F7] pb-20 lg:pb-0">
           <div className="p-2 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
             {children || <Outlet />}
           </div>
         </main>
         <BottomNavigation navLinks={navLinksVisiveis} onMenuClick={() => setSidebarAberta(true)} />
       </div>
    </div>
  );
}

function BottomNavigation({ navLinks, onMenuClick }) {
  const principais = navLinks
    .filter((link) => !link.type)
    .slice(0, 3);

  return (
    <nav className="lg:hidden fixed left-0 right-0 bottom-0 z-30 mobile-bottom-nav border-t border-gray-200 bg-white/95 px-2 pt-2 backdrop-blur">
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
            <span className="max-w-full truncate">{link.label}</span>
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

function SidebarContent({ usuario, navLinks, handleLogout, handleTrocarLayout, setSidebarAberta, layout }) {
  const isDireto = layout === 'direto';
  const [submenuAberto, setSubmenuAberto] = useState(null);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className="flex items-start gap-3 px-5 py-6 border-b border-white/10">
        {icons.logoIasd}
        <div>
          <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            PCM
          </p>
          <p className="text-[#C9963A] text-xs font-medium mt-0.5">Assoc. Paulistana</p>
        </div>
      </div>

      {/* Indicador do modelo atual */}
      <div className="px-3 pt-3">
        <div className={`rounded-lg px-3 py-2 flex items-center gap-2.5 ${isDireto ? 'bg-[#C9963A]/15 border border-[#C9963A]/20' : 'bg-white/5 border border-white/10'}`}>
          <div className={`w-2 h-2 rounded-full ${isDireto ? 'bg-[#C9963A]' : 'bg-blue-400'}`} />
          <span className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">
            {isDireto ? 'Modelo Direto' : 'Modelo Avançado'}
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 pr-2 space-y-1 sidebar-scroll">
        <p className="px-4 pt-2 pb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Menu</p>
        {navLinks.map((link) => {
          if (link.type === 'dropdown') {
            const aberto = submenuAberto === link.key;
            return (
              <div key={link.key}>
                <button
                  type="button"
                  onClick={() => setSubmenuAberto(aberto ? null : link.key)}
                  className={`sidebar-link w-full justify-between ${aberto ? 'active' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    {link.icon}
                    {link.label}
                  </span>
                  <svg className={`w-4 h-4 transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {aberto && (
                  <div className="space-y-1 pl-10 mt-1">
                    {link.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => { setSidebarAberta(false); setSubmenuAberto(null); }}
                        className={({ isActive }) =>
                          `sidebar-link text-sm ${isActive ? 'active' : 'text-white/70 hover:text-white'}`
                        }
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarAberta(false)}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Trocar layout + Usuário */}
      <div className="flex-shrink-0 px-3 py-4 border-t border-white/10 bg-[#162d54]/40 backdrop-blur-sm">
        {/* Botão trocar layout */}
        <button
          type="button"
          onClick={handleTrocarLayout}
          className="sidebar-link w-full text-[#C9963A]/80 hover:text-[#C9963A] hover:bg-[#C9963A]/10 mb-2"
        >
          {icons.trocaLayout}
          Trocar para {isDireto ? 'Avançado' : 'Direto'}
        </button>

        {/* Usuário logado */}
        <div className="bg-white/8 rounded-xl p-3 mb-3 backdrop-blur-sm border border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
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
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-link w-full text-red-300/80 hover:text-red-200 hover:bg-red-500/15"
        >
          {icons.logout}
          Sair do sistema
        </button>
      </div>
    </div>
  );
}
