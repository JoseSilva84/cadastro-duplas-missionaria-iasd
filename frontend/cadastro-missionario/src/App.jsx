import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';

// Páginas
import Login from './pages/Login';
import EscolhaLayout from './pages/EscolhaLayout';
import Layout from './components/Layout';
import Regioes from './pages/Regioes';
import Distritos from './pages/Distritos';
import Duplas from './pages/Duplas';
import DadosDupla from './pages/DadosDupla';
import Cadastro from './pages/Cadastro';
import Relatorios from './pages/Relatorios';
import ListagemDistritos from './pages/ListagemDistritos';
import ListagemIgrejas from './pages/ListagemIgrejas';

// Modelo Direto
import LayoutDireto from './components/LayoutDireto';
import RegioesDireto from './pages/direto/RegioesDireto';
import DistritosDireto from './pages/direto/DistritosDireto';
import DuplasDireto from './pages/direto/DuplasDireto';
import ListagemDistritosDireto from './pages/direto/ListagemDistritosDireto';
import ListagemIgrejasDireto from './pages/direto/ListagemIgrejasDireto';
import RelatoriosDireto from './pages/direto/RelatoriosDireto';

// Rota protegida — redireciona para login se não autenticado
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

// Rota apenas para admin
function RotaAdmin({ children }) {
  const { usuario } = useAuth();
  if (usuario?.perfil !== 'ADMINISTRADOR') {
    return <Navigate to="/regioes" replace />;
  }
  return children;
}

// Redireciona para escolha de layout se não houver layout selecionado
// Valida também se o layout atual corresponde ao modelo da rota
function RotaComLayout({ children, modelo }) {
  const { layout, carregando } = useAuth();
  if (carregando) return null;
  if (!layout) return <Navigate to="/escolha-layout" replace />;
  
  // Se o layout não corresponder ao modelo da rota, redireciona para o correto
  if (modelo === 'avancado' && layout !== 'avancado') {
    return <Navigate to="/direto/regioes" replace />;
  }
  if (modelo === 'direto' && layout !== 'direto') {
    return <Navigate to="/regioes" replace />;
  }
  
  return children;
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
            <EscolhaLayout />
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
              <Layout />
            </RotaComLayout>
          </RotaProtegida>
        }
      >
        <Route index element={<Navigate to="/regioes" replace />} />

        <Route path="regioes" element={<Regioes />} />
        <Route path="regioes/:regiaoId/distritos" element={<Distritos />} />

        {/* Global lists */}
        <Route path="distritos" element={<ListagemDistritos />} />
        <Route path="igrejas" element={<ListagemIgrejas />} />

        {/* Distritos */}
        <Route path="distritos/:distritoId/duplas" element={<Duplas />} />

        {/* Duplas */}
        <Route path="duplas" element={<Duplas />} />
        <Route path="duplas/nova" element={<Cadastro />} />
        <Route path="duplas/:id/editar" element={<Cadastro />} />
        <Route path="duplas/:id" element={<DadosDupla />} />

        {/* Relatórios — apenas admin */}
        <Route
          path="relatorios"
          element={
            <RotaAdmin>
              <Relatorios />
            </RotaAdmin>
          }
        />
      </Route>

      {/* ============================================
          MODELO DIRETO (master-detail em cards)
          ============================================ */}
      <Route
        path="/direto"
        element={
          <RotaProtegida>
            <RotaComLayout modelo="direto">
              <LayoutDireto />
            </RotaComLayout>
          </RotaProtegida>
        }
      >
        <Route index element={<Navigate to="/direto/regioes" replace />} />
        <Route path="regioes" element={<RegioesDireto />} />
        <Route path="distritos" element={<ListagemDistritosDireto />} />
        <Route path="igrejas" element={<ListagemIgrejasDireto />} />
        <Route path="distritos/:distritoId" element={<DistritosDireto />} />
        <Route path="duplas" element={<DuplasDireto />} />
        <Route path="duplas/nova" element={<Cadastro />} />
        <Route path="duplas/:id/editar" element={<Cadastro />} />
        <Route path="duplas/:id" element={<DadosDupla />} />
        <Route path="relatorios" element={<RelatoriosDireto />} />
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
