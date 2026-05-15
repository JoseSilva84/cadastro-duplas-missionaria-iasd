import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

// Contexto de autenticação global
const AuthContext = createContext(null);

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
      setUsuario(JSON.parse(usuarioSalvo));
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
