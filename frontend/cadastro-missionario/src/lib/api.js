import axios from 'axios';

// Cliente Axios configurado para a API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor — adiciona token JWT em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.metadata = { inicio: performance.now() };
  return config;
});

// Interceptor — trata erros globais (ex: token expirado)
api.interceptors.response.use(
  (res) => {
    const inicio = res.config?.metadata?.inicio;
    const duracaoMs = inicio ? performance.now() - inicio : 0;
    const rota = res.config?.url || '';
    if (duracaoMs >= 5000 && !rota.includes('/auditoria/')) {
      api.post('/auditoria/cliente', {
        tipo: 'REQUISICAO_LENTA',
        pagina: window.location.pathname,
        rota,
        duracaoMs: Math.round(duracaoMs),
        descricao: `A operação ${rota} demorou mais de 5 segundos no navegador.`,
      }).catch(() => {});
    }
    return res;
  },
  (err) => {
    const rota = err.config?.url || '';
    if (!rota.includes('/auditoria/') && (!err.response || err.response.status >= 500)) {
      const inicio = err.config?.metadata?.inicio;
      api.post('/auditoria/cliente', {
        tipo: err.response ? 'ERRO_FRONTEND' : 'FALHA_REDE',
        pagina: window.location.pathname,
        rota,
        duracaoMs: inicio ? Math.round(performance.now() - inicio) : undefined,
        descricao: err.response
          ? `O servidor respondeu com erro ${err.response.status} em ${rota}.`
          : `Não foi possível comunicar com o servidor em ${rota}.`,
        detalhes: { statusHttp: err.response?.status, mensagem: err.message },
      }).catch(() => {});
    }
    const isCredentialRequest = [
      '/auth/login',
      '/auth/conta',
      '/auth/redefinir-acesso',
      '/auth/validar-token-dupla',
      '/auth/criar-conta-dupla',
    ].some((rotaCredencial) => err.config?.url?.includes(rotaCredencial));
    const isSomenteLeitura = err.response?.data?.codigo === 'SOMENTE_LEITURA';
    if (!isCredentialRequest && !isSomenteLeitura && (err.response?.status === 401 || err.response?.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
