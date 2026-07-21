import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, PERFIS, ehAdmin, ehDupla, ehDiretorMissionarioIgreja } from './contexts/AuthContext';
import { Toaster } from 'sonner';

// Páginas
import Login from './pages/Login';
import Layout from './components/Layout';
import Regioes from './pages/Regioes';
import Distritos from './pages/Distritos';
import Duplas from './pages/direto/DuplasDireto';
import DadosDupla from './pages/DadosDupla';
import Cadastro from './pages/Cadastro';
import CadastroAcompanhamento from './pages/CadastroAcompanhamento';
import CadastroClasseBiblica from './pages/CadastroClasseBiblica';
import CadastroEscolaSabatina from './pages/CadastroEscolaSabatina';
import RegistroSaida from './pages/RegistroSaida';
import CadastroPastores from './pages/CadastroPastores';
import Relatorios from './pages/Relatorios';
import RelatorioEstudosGeral from './pages/RelatorioEstudosGeral';
import RelatorioEstudosBiblicos from './pages/RelatorioEstudosBiblicos';
import RelatorioRankingDecisoes from './pages/RelatorioRankingDecisoes';
import EstudanteDashboard from './pages/EstudanteDashboard';
import RelatorioClassesBiblicas from './pages/RelatorioClassesBiblicas';
import DashboardCoordenadorRegional from './pages/DashboardCoordenadorRegional';
import DashboardAssociacao from './pages/DashboardAssociacao';
import RelatorioPersonalizado from './pages/RelatorioPersonalizado';
import ListagemDistritos from './pages/ListagemDistritos';
import ListagemIgrejas from './pages/ListagemIgrejas';
import MinhaDupla from './pages/MinhaDupla';
import GestaoUsuarios from './pages/GestaoUsuarios';

// Modelo Direto
import LayoutDireto from './components/LayoutDireto';
import RegioesDireto from './pages/direto/RegioesDireto';
import DistritosDireto from './pages/direto/DistritosDireto';
import DuplasDireto from './pages/direto/DuplasDireto';
import ListagemDistritosDireto from './pages/direto/ListagemDistritosDireto';
import ListagemIgrejasDireto from './pages/direto/ListagemIgrejasDireto';
import RelatoriosDireto from './pages/direto/RelatoriosDireto';

// ─── Rota protegida — redireciona para login se não autenticado ────────────────
function RotaProtegida({ children }) {
  const { usuario, carregando } = useAuth();
  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando sistema...</p>
        </div>
      </div>
    );
  }
  return usuario ? children : <Navigate to="/login" replace />;
}

// ─── Rota apenas para Admins (SUPER_ADMIN + ADMINISTRADOR) ────────────────────
function RotaAdmin({ children }) {
  const { usuario } = useAuth();
  if (!ehAdmin(usuario)) {
    // DUPLA_MISSIONARIA vai direto para minha-dupla; outros vão para regiões
    return ehDupla(usuario)
      ? <Navigate to="/minha-dupla" replace />
      : <Navigate to="/regioes" replace />;
  }
  return children;
}

// ─── Rota bloqueada para DUPLA_MISSIONARIA ────────────────────────────────────
// A dupla não pode acessar nenhuma rota de listagem geográfica
function RotaBloqueadaParaDupla({ children }) {
  return children;
}

// ─── Rota com exigência de perfis específicos ─────────────────────────────────
// redirectTo: para onde redirecionar se não tiver permissão
function RotaComPerfis({ children, perfisPermitidos, redirectTo = '/regioes' }) {
  const { usuario } = useAuth();
  if (!usuario || !perfisPermitidos.includes(usuario.perfil)) {
    return <Navigate to={redirectTo} replace />;
  }
  return children;
}

function destinoInicial(usuario, layout = 'avancado') {
  const prefix = layout === 'direto' ? '/direto' : '';
  if (ehDupla(usuario) || ehDiretorMissionarioIgreja(usuario)) return `${prefix}/igrejas`;
  if (usuario?.perfil === PERFIS.PASTOR_DISTRITAL) return `${prefix}/distritos`;
  return `${prefix}/regioes`;
}

// ─── Redireciona para escolha de layout ou rota correta após login ────────────
function RotaComLayout({ children, modelo }) {
  const { usuario, layout, carregando } = useAuth();
  if (carregando) return null;
  if (!layout) return <Navigate to={destinoInicial(usuario, 'avancado')} replace />;

  if (modelo === 'avancado' && layout !== 'avancado') {
    return <Navigate to={destinoInicial(usuario, 'direto')} replace />;
  }
  if (modelo === 'direto' && layout !== 'direto') {
    return <Navigate to={destinoInicial(usuario, 'avancado')} replace />;
  }

  return children;
}

// ─── Redirect inteligente após login (baseado no perfil) ─────────────────────
function RedirectPosLogin() {
  const { usuario, layout } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={destinoInicial(usuario, layout)} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rota pública */}
      <Route path="/login" element={<Login />} />

      {/* Escolha de layout — após login, antes de qualquer coisa */}
      <Route
        path="/escolha-layout"
        element={
          <RotaProtegida>
            <RedirectPosLogin />
          </RotaProtegida>
        }
      />

      {/* ─── Rota exclusiva DUPLA_MISSIONARIA ─────────────────────────────── */}
      <Route
        path="/minha-dupla"
        element={
          <RotaProtegida>
            <RotaComPerfis
              perfisPermitidos={[PERFIS.DUPLA_MISSIONARIA]}
              redirectTo="/regioes"
            >
              <Layout>
                <MinhaDupla />
              </Layout>
            </RotaComPerfis>
          </RotaProtegida>
        }
      />

      {/* ============================================
          MODELO AVANÇADO (padrão hierárquico)
          ============================================ */}
      <Route
        path="/"
        element={
          <RotaProtegida>
            <RotaComLayout modelo="avancado">
              <RotaBloqueadaParaDupla>
                <Layout />
              </RotaBloqueadaParaDupla>
            </RotaComLayout>
          </RotaProtegida>
        }
      >
        <Route index element={<RedirectPosLogin />} />

        {/* Regiões — bloqueado para DUPLA_MISSIONARIA (já tratado em RotaBloqueadaParaDupla) */}
        <Route
          path="regioes"
          element={
            <RotaComPerfis
              perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL]}
              redirectTo="/distritos"
            >
              <Regioes />
            </RotaComPerfis>
          }
        />
        <Route
          path="regioes/:regiaoId/distritos"
          element={
            <RotaComPerfis
              perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL]}
              redirectTo="/distritos"
            >
              <Distritos />
            </RotaComPerfis>
          }
        />

        {/* Global lists */}
        <Route path="distritos" element={<ListagemDistritos />} />
        <Route path="igrejas" element={<ListagemIgrejas />} />

        {/* Distritos */}
        <Route path="distritos/:distritoId/duplas" element={<Duplas />} />

        {/* Duplas */}
        <Route path="duplas" element={<Duplas />} />
        <Route path="duplas/nova" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA]}><Cadastro /></RotaComPerfis>} />
        <Route path="cadastro/estudos-biblicos" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]}><CadastroAcompanhamento tipo="estudo" /></RotaComPerfis>} />
        <Route path="cadastro/estudos-biblicos/:id/editar" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]}><CadastroAcompanhamento tipo="estudo" /></RotaComPerfis>} />
        <Route path="cadastro/ponto-estudo" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]}><CadastroAcompanhamento tipo="ponto" /></RotaComPerfis>} />
        <Route path="cadastro/ponto-estudo/:id/editar" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]}><CadastroAcompanhamento tipo="ponto" /></RotaComPerfis>} />
        <Route path="cadastro/classe-biblica" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]}><CadastroClasseBiblica /></RotaComPerfis>} />
        <Route path="cadastro/classe-biblica/:id/editar" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]}><CadastroClasseBiblica /></RotaComPerfis>} />

        {/* Escola Sabatina — apenas perfis com acesso distrital+ */}
        <Route
          path="cadastro/escola-sabatina"
          element={
            <RotaComPerfis
              perfisPermitidos={[
                PERFIS.SUPER_ADMIN,
                PERFIS.ADMINISTRADOR,
                PERFIS.PASTOR_REGIONAL,
                PERFIS.PASTOR_DISTRITAL,
                PERFIS.COORDENADOR_REGIONAL,
                PERFIS.DIRETOR_MISSIONARIO_IGREJA,
                PERFIS.DIRETOR_MISSIONARIO_IGREJA,
              ]}
            >
              <CadastroEscolaSabatina />
            </RotaComPerfis>
          }
        />

        <Route path="duplas/:id/editar" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL]}><Cadastro /></RotaComPerfis>} />
        <Route path="duplas/:id" element={<DadosDupla />} />
        <Route path="registro-saida" element={<RegistroSaida />} />

        {/* Lideranças — apenas para quem pode gerenciar */}
        <Route
          path="cadastro/liderancas"
          element={
            <RotaComPerfis
              perfisPermitidos={[
                PERFIS.SUPER_ADMIN,
                PERFIS.ADMINISTRADOR,
                PERFIS.PASTOR_REGIONAL,
                PERFIS.PASTOR_DISTRITAL,
                PERFIS.COORDENADOR_REGIONAL,
                PERFIS.DIRETOR_MISSIONARIO_IGREJA,
                PERFIS.DIRETOR_MISSIONARIO_IGREJA,
              ]}
            >
              <CadastroPastores />
            </RotaComPerfis>
          }
        />

        {/* Gestão de Usuários — apenas admins */}
        <Route
          path="gestao-usuarios"
          element={
            <RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}>
              <GestaoUsuarios />
            </RotaComPerfis>
          }
        />

        {/* Relatórios — apenas admins e pastores regionais */}
        <Route
          path="relatorios"
          element={
            <RotaComPerfis
              perfisPermitidos={[
                PERFIS.SUPER_ADMIN,
                PERFIS.ADMINISTRADOR,
                PERFIS.PASTOR_REGIONAL,
                PERFIS.PASTOR_DISTRITAL,
                PERFIS.COORDENADOR_REGIONAL,
                PERFIS.DIRETOR_MISSIONARIO_IGREJA,
              ]}
            >
              <Relatorios />
            </RotaComPerfis>
          }
        />
        <Route path="relatorios/dashboard-associacao" element={<DashboardAssociacao />} />
        <Route path="relatorios/personalizado" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}><RelatorioPersonalizado /></RotaComPerfis>} />
        <Route path="relatorios/estudos-geral" element={<RelatorioEstudosGeral />} />
        <Route path="relatorios/ranking-decisoes" element={<RelatorioRankingDecisoes />} />
        <Route path="relatorios/estudos-cadastrados" element={<RelatorioEstudosBiblicos tipoRelatorio="TODOS" />} />
        <Route path="relatorios/estudos-biblicos" element={<RelatorioEstudosBiblicos tipoRelatorio="UNICO" />} />
        <Route path="relatorios/estudos-biblicos/:id" element={<EstudanteDashboard />} />
        <Route path="relatorios/pontos-estudo" element={<RelatorioEstudosBiblicos tipoRelatorio="PONTO" />} />
        <Route path="relatorios/pontos-estudo/:id" element={<EstudanteDashboard />} />
        <Route path="relatorios/classes-biblicas/registros" element={<RelatorioEstudosBiblicos tipoRelatorio="CLASSE" />} />
        <Route path="relatorios/classes-biblicas/registros/:id" element={<EstudanteDashboard />} />
        <Route path="relatorios/classes-biblicas" element={<RelatorioClassesBiblicas />} />
        <Route path="relatorios/coordenador-regional" element={<DashboardCoordenadorRegional />} />
      </Route>

      {/* ============================================
          MODELO DIRETO (master-detail em cards)
          ============================================ */}
      <Route
        path="/direto"
        element={
          <RotaProtegida>
            <RotaComLayout modelo="direto">
              <RotaBloqueadaParaDupla>
                <LayoutDireto />
              </RotaBloqueadaParaDupla>
            </RotaComLayout>
          </RotaProtegida>
        }
      >
        <Route index element={<RedirectPosLogin />} />
        <Route
          path="regioes"
          element={
            <RotaComPerfis
              perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL]}
              redirectTo="/direto/distritos"
            >
              <RegioesDireto />
            </RotaComPerfis>
          }
        />
        <Route path="distritos" element={<ListagemDistritosDireto />} />
        <Route path="igrejas" element={<ListagemIgrejasDireto />} />
        <Route path="igrejas/:igrejaId" element={<ListagemIgrejasDireto />} />
        <Route path="distritos/:distritoId" element={<DistritosDireto />} />
        <Route path="duplas" element={<DuplasDireto />} />
        <Route path="duplas/nova" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA]} redirectTo="/direto/distritos"><Cadastro /></RotaComPerfis>} />
        <Route path="cadastro/estudos-biblicos" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]} redirectTo="/direto/distritos"><CadastroAcompanhamento tipo="estudo" /></RotaComPerfis>} />
        <Route path="cadastro/estudos-biblicos/:id/editar" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]} redirectTo="/direto/distritos"><CadastroAcompanhamento tipo="estudo" /></RotaComPerfis>} />
        <Route path="cadastro/ponto-estudo" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]} redirectTo="/direto/distritos"><CadastroAcompanhamento tipo="ponto" /></RotaComPerfis>} />
        <Route path="cadastro/ponto-estudo/:id/editar" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]} redirectTo="/direto/distritos"><CadastroAcompanhamento tipo="ponto" /></RotaComPerfis>} />
        <Route path="cadastro/classe-biblica" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]} redirectTo="/direto/distritos"><CadastroClasseBiblica /></RotaComPerfis>} />
        <Route path="cadastro/classe-biblica/:id/editar" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA]} redirectTo="/direto/distritos"><CadastroClasseBiblica /></RotaComPerfis>} />
        <Route
          path="cadastro/escola-sabatina"
          element={
            <RotaComPerfis
              perfisPermitidos={[
                PERFIS.SUPER_ADMIN,
                PERFIS.ADMINISTRADOR,
                PERFIS.PASTOR_REGIONAL,
                PERFIS.PASTOR_DISTRITAL,
                PERFIS.COORDENADOR_REGIONAL,
              ]}
            >
              <CadastroEscolaSabatina />
            </RotaComPerfis>
          }
        />
        <Route path="duplas/:id/editar" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL]} redirectTo="/direto/distritos"><Cadastro /></RotaComPerfis>} />
        <Route path="duplas/:id" element={<DadosDupla />} />
        <Route path="registro-saida" element={<RegistroSaida />} />
        <Route
          path="cadastro/liderancas"
          element={
            <RotaComPerfis
              perfisPermitidos={[
                PERFIS.SUPER_ADMIN,
                PERFIS.ADMINISTRADOR,
                PERFIS.PASTOR_REGIONAL,
                PERFIS.PASTOR_DISTRITAL,
                PERFIS.COORDENADOR_REGIONAL,
              ]}
            >
              <CadastroPastores />
            </RotaComPerfis>
          }
        />
        <Route
          path="gestao-usuarios"
          element={
            <RotaComPerfis
              perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]}
              redirectTo="/direto/distritos"
            >
              <GestaoUsuarios />
            </RotaComPerfis>
          }
        />
        <Route path="relatorios" element={<RelatoriosDireto />} />
        <Route path="relatorios/dashboard-associacao" element={<DashboardAssociacao />} />
        <Route path="relatorios/personalizado" element={<RotaComPerfis perfisPermitidos={[PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR]} redirectTo="/direto/relatorios"><RelatorioPersonalizado /></RotaComPerfis>} />
        <Route path="relatorios/estudos-geral" element={<RelatorioEstudosGeral />} />
        <Route path="relatorios/ranking-decisoes" element={<RelatorioRankingDecisoes />} />
        <Route path="relatorios/estudos-cadastrados" element={<RelatorioEstudosBiblicos tipoRelatorio="TODOS" />} />
        <Route path="relatorios/estudos-biblicos" element={<RelatorioEstudosBiblicos tipoRelatorio="UNICO" />} />
        <Route path="relatorios/estudos-biblicos/:id" element={<EstudanteDashboard />} />
        <Route path="relatorios/pontos-estudo" element={<RelatorioEstudosBiblicos tipoRelatorio="PONTO" />} />
        <Route path="relatorios/pontos-estudo/:id" element={<EstudanteDashboard />} />
        <Route path="relatorios/classes-biblicas/registros" element={<RelatorioEstudosBiblicos tipoRelatorio="CLASSE" />} />
        <Route path="relatorios/classes-biblicas/registros/:id" element={<EstudanteDashboard />} />
        <Route path="relatorios/classes-biblicas" element={<RelatorioClassesBiblicas />} />
        <Route path="relatorios/coordenador-regional" element={<DashboardCoordenadorRegional />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            style: {
              fontFamily: 'Inter, system-ui, sans-serif',
            },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
