import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

// Contexto de autenticação global
const AuthContext = createContext(null);

// ─── Helpers de Verificação de Perfil ─────────────────────────────────────────
export const PERFIS = {
  SUPER_ADMIN:          'SUPER_ADMIN',
  ADMINISTRADOR:        'ADMINISTRADOR',
  PASTOR_REGIONAL:      'PASTOR_REGIONAL',
  PASTOR_DISTRITAL:     'PASTOR_DISTRITAL',
  COORDENADOR_REGIONAL: 'COORDENADOR_REGIONAL',
  DUPLA_MISSIONARIA:    'DUPLA_MISSIONARIA',
};

// Perfis com acesso administrativo total
export const ADMINS = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR];

// Verifica se o usuário é admin total
export const ehAdmin = (usuario) =>
  usuario && ADMINS.includes(usuario.perfil);

// Verifica se é DUPLA_MISSIONARIA
export const ehDupla = (usuario) =>
  usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA;

// Verifica se é Pastor Regional
export const ehPastorRegional = (usuario) =>
  usuario && usuario.perfil === PERFIS.PASTOR_REGIONAL;

// Verifica se é Pastor Distrital
export const ehPastorDistrital = (usuario) =>
  usuario && usuario.perfil === PERFIS.PASTOR_DISTRITAL;

// Verifica se é Coordenador Regional
export const ehCoordenador = (usuario) =>
  usuario && usuario.perfil === PERFIS.COORDENADOR_REGIONAL;

// Tem acesso a painel gerencial (acima de Coordenador)
export const temAcessoGerencial = (usuario) =>
  usuario && [
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.PASTOR_REGIONAL,
    PERFIS.PASTOR_DISTRITAL,
  ].includes(usuario.perfil);

// Verifica se o usuário tem um dos perfis listados
export const temPerfil = (usuario, ...perfis) =>
  usuario && perfis.includes(usuario.perfil);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [layout, setLayoutState] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Restaura sessão ao carregar a aplicação
  useEffect(() => {
    const token = localStorage.getItem('token');
    const usuarioSalvo = localStorage.getItem('usuario');
    const layoutSalvo = localStorage.getItem('layout');
    if (token && usuarioSalvo) {
      try {
        setUsuario(JSON.parse(usuarioSalvo));
      } catch {
        localStorage.removeItem('usuario');
      }
    }
    if (layoutSalvo) {
      setLayoutState(layoutSalvo);
    }
    setCarregando(false);
  }, []);

  // Realiza login e armazena token/dados do usuário
  const login = async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('token', data.token);
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
    return data.usuario;
  };

  // Realiza logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('layout');
    setUsuario(null);
    setLayoutState(null);
  };

  // Define o layout e persiste
  const setLayout = (novoLayout) => {
    localStorage.setItem('layout', novoLayout);
    setLayoutState(novoLayout);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, carregando, layout, setLayout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
