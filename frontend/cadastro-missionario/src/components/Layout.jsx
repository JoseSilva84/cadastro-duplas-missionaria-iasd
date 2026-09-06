import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth, PERFIS, ehAdmin, ehSomenteLeitura } from '../contexts/AuthContext';
import UsuarioAvatar from './UsuarioAvatar';
import { escopoUsuario, funcaoUsuario, nomePessoaUsuario } from '../lib/usuarioIdentidade';

const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13h6V4H4v9zm10 7h6V4h-6v16zM4 20h6v-3H4v3z" />
    </svg>
  ),
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
  alunos: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c3.314 0 6 1.343 6 3v2H6v-2c0-1.657 2.686-3 6-3zM12 11a4 4 0 100-8 4 4 0 000 8z" />
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
  mapaIgreja: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 18l-6 3V6l6-3 6 3 6-3v15l-6 3-6-3zm0 0V3m6 18V6" />
    </svg>
  ),
  configuracoes: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

export default function Layout({ children }) {
  const { usuario, logout, layout } = useAuth();
  const navigate = useNavigate();
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = ehAdmin(usuario); // SUPER_ADMIN + ADMINISTRADOR
  const isSomenteLeitura = ehSomenteLeitura(usuario);
  const isDupla = usuario?.perfil === PERFIS.DUPLA_MISSIONARIA;
  const isDiretorMissionario = usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA;
  const isCoordenadorRegional = usuario?.perfil === PERFIS.COORDENADOR_REGIONAL;
  const isPastorDistrital = usuario?.perfil === PERFIS.PASTOR_DISTRITAL;
  const podeVerAlunos = isAdmin || [PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA].includes(usuario?.perfil);
  const podeGerenciarLiderancas = !isSomenteLeitura && (isAdmin || [PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil));
  const podeVerRelatorios = isAdmin || isDupla || [PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil);
  const podeCadastrarDupla = !isSomenteLeitura && !isDupla;
  const podeGerenciarUsuarios = !isSomenteLeitura && (isAdmin || [PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA].includes(usuario?.perfil));
  const isDireto = layout === 'direto';

  const navLinks = isDupla || isDiretorMissionario
    ? [
        { to: isDireto ? '/direto/igrejas' : '/igrejas', label: 'Minha Igreja', icon: icons.igrejas },
        { to: isDireto ? '/direto/duplas' : '/duplas', label: 'Duplas', icon: icons.duplas },
        ...(podeVerAlunos ? [{ to: isDireto ? '/direto/alunos' : '/alunos', label: 'Alunos', icon: icons.alunos }] : []),
        { type: 'dropdown', key: 'cadastro', label: 'Cadastro', icon: icons.cadastro, items: [
          ...(isDiretorMissionario ? [{ to: isDireto ? '/direto/duplas/nova' : '/duplas/nova', label: 'Nova Dupla', icon: '+' }] : []),
          ...(isDiretorMissionario ? [{ to: isDireto ? '/direto/cadastro/mapa-igreja' : '/cadastro/mapa-igreja', label: 'Mapa da Igreja', icon: 'MI' }] : []),
          { to: isDireto ? '/direto/cadastro/estudos-biblicos' : '/cadastro/estudos-biblicos', label: 'Estudos Bíblicos', icon: '📖' },
          { to: isDireto ? '/direto/cadastro/ponto-estudo' : '/cadastro/ponto-estudo', label: 'Ponto de Estudo', icon: 'PE' },
          { to: isDireto ? '/direto/cadastro/classe-biblica' : '/cadastro/classe-biblica', label: 'Classe Bíblica', icon: 'CB' },
          ...(isDiretorMissionario ? [
            { to: isDireto ? '/direto/cadastro/escola-sabatina' : '/cadastro/escola-sabatina', label: 'Escola Sabatina', icon: 'ES' },
            { to: isDireto ? '/direto/cadastro/liderancas?tipo=diretor_mp' : '/cadastro/liderancas?tipo=diretor_mp', label: 'Diretor Minist. Pessoal', icon: 'MP' },
          ] : []),
        ] },
        ...(isDupla ? [{ type: 'dropdown', key: 'relatorios', label: 'Relatórios', icon: icons.relatorios, items: [
          { to: isDireto ? '/direto/relatorios/estudos-geral' : '/relatorios/estudos-geral', label: 'Estudos no Geral', icon: 'EG' },
          { to: isDireto ? '/direto/relatorios/estudos-biblicos' : '/relatorios/estudos-biblicos', label: 'Estudantes Bíblicos', icon: '📖' },
          { to: isDireto ? '/direto/relatorios/pontos-estudo' : '/relatorios/pontos-estudo', label: 'Pontos de Estudo', icon: 'PE' },
          { to: isDireto ? '/direto/relatorios/classes-biblicas' : '/relatorios/classes-biblicas', label: 'Classes Bíblicas', icon: 'CB' },
        ] }] : []),
        { to: isDireto ? '/direto/configuracoes' : '/configuracoes', label: 'Configurações', icon: icons.configuracoes },
      ]
    : isDireto
    ? [
        ...(isAdmin ? [{ to: '/direto/dashboard', label: 'Dashboard', icon: icons.dashboard }] : []),
        ...(!isPastorDistrital ? [{ to: '/direto/regioes', label: 'Regiões', icon: icons.regioes }] : []),
        { to: '/direto/distritos', label: 'Distritos', icon: icons.distritos },
        { to: '/direto/igrejas', label: 'Igrejas', icon: icons.igrejas },
        { to: '/direto/duplas', label: 'Duplas', icon: icons.duplas },
        ...(podeVerAlunos ? [{ to: '/direto/alunos', label: 'Alunos', icon: icons.alunos }] : []),
        { type: 'dropdown', key: 'cadastro', label: 'Cadastro', icon: icons.cadastro, items: [
          ...(podeCadastrarDupla ? [{ to: '/direto/duplas/nova', label: 'Nova Dupla', icon: '+' }] : []),
          { to: '/direto/cadastro/estudos-biblicos', label: 'Estudos Bíblicos', icon: '📖' },
          { to: '/direto/cadastro/ponto-estudo', label: 'Ponto de Estudo', icon: 'PE' },
          { to: '/direto/cadastro/classe-biblica', label: 'Classe Bíblica', icon: 'CB' },
          { to: '/direto/cadastro/escola-sabatina', label: 'Escola Sabatina', icon: 'ES' },
          { to: '/direto/cadastro/mapa-igreja', label: 'Mapa da Igreja', icon: 'MI' },
          ...(podeGerenciarLiderancas ? [
            { to: '/direto/cadastro/liderancas?tipo=diretor_mp', label: 'Diretor Minist. Pessoal', icon: 'MP' },
            { to: '/direto/cadastro/liderancas?tipo=distrital', label: 'Pastor Distrital', icon: 'PD' },
            { to: '/direto/cadastro/liderancas?tipo=coordenador', label: 'Coordenador Regional', icon: 'CR' },
            { to: '/direto/cadastro/liderancas?tipo=igreja', label: 'Dados da Igreja', icon: 'IG' },
            { to: '/direto/cadastro/liderancas', label: 'Lideranças', icon: '🏅' },
          ] : []),
          ...(podeGerenciarUsuarios ? [{ to: '/direto/gestao-usuarios', label: 'Gestão de Usuários', icon: 'GU' }] : []),
          { to: '/direto/registro-saida', label: 'Registro de Assistência (Coor. Reg.)', icon: '✅' },
        ] },
        ...(podeVerRelatorios ? [{ type: 'dropdown', key: 'relatorios', label: 'Relatórios', icon: icons.relatorios, items: [
          { to: '/direto/relatorios', label: 'Geral', icon: '📊' },
          { to: '/direto/relatorios/estudos-geral', label: 'Estudos no Geral', icon: 'EG' },
          ...(isAdmin ? [{ to: '/direto/relatorios/dashboard-associacao', label: 'Duplas Missionárias', icon: 'DM' }] : []),
          ...(isAdmin ? [{ to: '/direto/relatorios/personalizado', label: 'Relatório Personalizado', icon: 'RP' }] : []),
          { to: '/direto/relatorios/estudos-biblicos', label: 'Estudantes Bíblicos', icon: '📖' },
          { to: '/direto/relatorios/pontos-estudo', label: 'Pontos de Estudo', icon: 'PE' },
          { to: '/direto/relatorios/classes-biblicas', label: 'Classes Bíblicas', icon: 'CB' },
          { to: '/direto/relatorios/coordenador-regional', label: 'Coordenador Regional', icon: 'CR' },
        ] }] : []),
        ...(isAdmin ? [{ to: '/direto/mapa-igreja', label: 'Mapa da Igreja', icon: icons.mapaIgreja }] : []),
        { to: '/direto/configuracoes', label: 'Configurações', icon: icons.configuracoes },
      ]
    : [
        ...(isAdmin ? [{ to: '/dashboard', label: 'Dashboard', icon: icons.dashboard }] : []),
        ...(!isPastorDistrital ? [{ to: '/regioes', label: 'Regiões', icon: icons.regioes }] : []),
        { to: '/distritos', label: 'Distritos', icon: icons.distritos },
        { to: '/igrejas', label: 'Igrejas', icon: icons.igrejas },
        { to: '/duplas', label: 'Duplas', icon: icons.duplas },
        ...(podeVerAlunos ? [{ to: '/alunos', label: 'Alunos', icon: icons.alunos }] : []),
        { type: 'dropdown', key: 'cadastro', label: 'Cadastro', icon: icons.cadastro, items: [
          ...(podeCadastrarDupla ? [{ to: '/duplas/nova', label: 'Nova Dupla', icon: '+' }] : []),
          { to: '/cadastro/estudos-biblicos', label: 'Estudos Bíblicos', icon: '📖' },
          { to: '/cadastro/ponto-estudo', label: 'Ponto de Estudo', icon: 'PE' },
          { to: '/cadastro/classe-biblica', label: 'Classe Bíblica', icon: 'CB' },
          { to: '/cadastro/escola-sabatina', label: 'Escola Sabatina', icon: 'ES' },
          { to: '/cadastro/mapa-igreja', label: 'Mapa da Igreja', icon: 'MI' },
          ...(podeGerenciarLiderancas ? [
            { to: '/cadastro/liderancas?tipo=diretor_mp', label: 'Diretor Minist. Pessoal', icon: 'MP' },
            { to: '/cadastro/liderancas?tipo=distrital', label: 'Pastor Distrital', icon: 'PD' },
            { to: '/cadastro/liderancas?tipo=coordenador', label: 'Coordenador Regional', icon: 'CR' },
            { to: '/cadastro/liderancas?tipo=igreja', label: 'Dados da Igreja', icon: 'IG' },
            { to: '/cadastro/liderancas', label: 'Lideranças', icon: '🏅' },
          ] : []),
          ...(podeGerenciarUsuarios ? [{ to: '/gestao-usuarios', label: 'Gestão de Usuários', icon: 'GU' }] : []),
          { to: '/registro-saida', label: 'Registro de Assistência (Coor. Reg.)', icon: '✅' },
        ] },
        ...(podeVerRelatorios ? [{ type: 'dropdown', key: 'relatorios', label: 'Relatórios', icon: icons.relatorios, items: [
          { to: '/relatorios', label: 'Geral', icon: '📊' },
          { to: '/relatorios/estudos-geral', label: 'Estudos no Geral', icon: 'EG' },
          ...(isAdmin ? [{ to: '/relatorios/dashboard-associacao', label: 'Duplas Missionárias', icon: 'DM' }] : []),
          ...(isAdmin ? [{ to: '/relatorios/personalizado', label: 'Relatório Personalizado', icon: 'RP' }] : []),
          { to: '/relatorios/estudos-biblicos', label: 'Estudantes Bíblicos', icon: '📖' },
          { to: '/relatorios/pontos-estudo', label: 'Pontos de Estudo', icon: 'PE' },
          { to: '/relatorios/classes-biblicas', label: 'Classes Bíblicas', icon: 'CB' },
          { to: '/relatorios/coordenador-regional', label: 'Coordenador Regional', icon: 'CR' },
        ] }] : []),
        ...(isAdmin ? [{ to: '/mapa-igreja', label: 'Mapa da Igreja', icon: icons.mapaIgreja }] : []),
        { to: '/configuracoes', label: 'Configurações', icon: icons.configuracoes },
      ];

  const navLinksSemEscrita = isSomenteLeitura
    ? navLinks.filter((link) => (
      link.key !== 'cadastro' &&
      !['/gestao-usuarios', '/direto/gestao-usuarios'].includes(link.to)
    ))
    : navLinks;

  const navLinksVisiveis = isCoordenadorRegional
    ? navLinksSemEscrita.map((link) => {
      if (link.key === 'relatorios') {
        return {
          ...link,
          items: link.items.filter((item) => (
            item.to.includes('/relatorios/estudos-geral') ||
            item.to.includes('/relatorios/estudos-biblicos') ||
            item.to.includes('/relatorios/pontos-estudo') ||
            item.to.includes('/relatorios/classes-biblicas')
          )),
        };
      }
      return link;
    })
    : navLinksSemEscrita;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col w-52 flex-shrink-0 xl:w-64"
        style={{ background: 'linear-gradient(180deg, #0b1a36 0%, #1A3A6B 40%, #162d54 100%)' }}
      >
        <SidebarContent
          usuario={usuario}
          navLinks={navLinksVisiveis}
          handleLogout={handleLogout}
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

function SidebarContent({ usuario, navLinks, handleLogout, setSidebarAberta }) {
  const [submenuAberto, setSubmenuAberto] = useState(null);
  const funcao = usuario?.somenteLeitura ? 'Suporte (somente leitura)' : funcaoUsuario(usuario);
  const nomePessoa = nomePessoaUsuario(usuario);
  const escopo = escopoUsuario(usuario);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className="flex items-start gap-2.5 border-b border-white/10 px-4 py-4 xl:gap-3 xl:px-5 xl:py-6">
        {icons.logoIasd}
        <div>
          <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
            PCM
          </p>
          <p className="text-[#C9963A] text-xs font-medium mt-0.5">Assoc. Paulistana</p>
        </div>
      </div>

      {/* Indicador do modelo atual */}
      <div className="hidden">
        <div>
          <div />
          <span className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">
            {null}
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-contain px-2 py-2 pr-1.5 space-y-0.5 sidebar-scroll xl:px-3 xl:pr-2 xl:space-y-1">
        <p className="px-3 pt-0 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30 xl:px-4 xl:pb-2">Menu</p>
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
        <div className="mt-auto border-t border-white/10 pt-5">
          <div className="mb-2 rounded-xl border border-white/5 bg-white/8 p-2.5 backdrop-blur-sm xl:p-3">
            <div className="flex items-center gap-2.5">
              <UsuarioAvatar usuario={usuario} className="h-9 w-9 flex-shrink-0 rounded-full shadow-md" fallbackClassName="text-xs" />
              <div className="min-w-0">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">
                  {funcao} <span className="text-[10px] font-normal text-white/60">• {nomePessoa}</span>
                </p>
              </div>
            </div>
            {escopo.length > 0 && (
              <p className="mt-2 truncate pl-11 text-[10px] text-[#C9963A]">{escopo.join(' • ')}</p>
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
      </nav>

      {/* Usuário */}
      <div className="hidden">
        {/* Usuário logado */}
        <div className="mb-2 rounded-xl border border-white/5 bg-white/8 p-2.5 backdrop-blur-sm xl:mb-3 xl:p-3">
          <div className="flex items-center gap-2.5">
            <UsuarioAvatar usuario={usuario} className="h-9 w-9 flex-shrink-0 rounded-full shadow-md" fallbackClassName="text-xs" />
            <div className="min-w-0">
              <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">
                {funcao} <span className="text-[10px] font-normal text-white/60">• {nomePessoa}</span>
              </p>
            </div>
          </div>
          {escopo.length > 0 && (
            <p className="mt-2 truncate pl-11 text-[10px] text-[#C9963A]">{escopo.join(' • ')}</p>
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
