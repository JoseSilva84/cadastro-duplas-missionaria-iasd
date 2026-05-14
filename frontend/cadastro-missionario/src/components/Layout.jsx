import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const icons = {
  regioes: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
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
};

const perfilLabel = {
  ADMINISTRADOR: 'Administrador',
  COORDENADOR_REGIONAL: 'Coordenador Regional',
  PASTOR_DISTRITAL: 'Pastor Distrital',
  LIDER_REGIOES: 'Líder de Regiões',
};

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = usuario?.perfil === 'ADMINISTRADOR';

  const navLinks = [
    { to: '/regioes', label: 'Regiões', icon: icons.regioes },
    { to: '/duplas', label: 'Duplas', icon: icons.duplas },
    { to: '/duplas/nova', label: 'Nova Dupla', icon: icons.cadastro },
    ...(isAdmin ? [{ to: '/relatorios', label: 'Relatórios', icon: icons.relatorios }] : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #0b1a36 0%, #1A3A6B 40%, #162d54 100%)' }}
      >
        <SidebarContent
          usuario={usuario}
          navLinks={navLinks}
          handleLogout={handleLogout}
          setSidebarAberta={setSidebarAberta}
        />
      </aside>

      {/* Sidebar mobile */}
      <div className={`fixed inset-0 z-40 lg:hidden transition-all duration-300 ${sidebarAberta ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${sidebarAberta ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setSidebarAberta(false)}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-72 flex flex-col z-50 transition-transform duration-300 ease-out ${sidebarAberta ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ background: 'linear-gradient(180deg, #0b1a36 0%, #1A3A6B 40%, #162d54 100%)' }}
        >
          <SidebarContent
            usuario={usuario}
            navLinks={navLinks}
            handleLogout={handleLogout}
            setSidebarAberta={setSidebarAberta}
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
            onClick={() => setSidebarAberta(true)}
            className="text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
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

        <main className="flex-1 overflow-y-auto bg-[#F4F5F7]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ usuario, navLinks, handleLogout, setSidebarAberta }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-start gap-3 px-5 py-6 border-b border-white/10">
        {icons.logoIasd}
        <div>
          <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            Duplas Missionárias
          </p>
          <p className="text-[#C9963A] text-xs font-medium mt-0.5">Assoc. Paulistana</p>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-4 pt-2 pb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">Menu</p>
        {navLinks.map((link, i) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setSidebarAberta(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Usuário logado */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="bg-white/8 rounded-xl p-3 mb-3 backdrop-blur-sm border border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
              {usuario?.nome?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{usuario?.nome}</p>
              <p className="text-white/50 text-xs">{perfilLabel[usuario?.perfil]}</p>
            </div>
          </div>
          {usuario?.regiao && (
            <p className="text-[#C9963A] text-xs mt-2 pl-10">📍 {usuario.regiao.nome}</p>
          )}
        </div>
        <button
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
