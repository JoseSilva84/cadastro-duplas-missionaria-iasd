import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const enviar = (dados) => api.post('/auditoria/cliente', dados).catch(() => {});

export default function MonitorAuditoria() {
  const { usuario } = useAuth();
  const location = useLocation();
  const ultimoCiclo = useRef(0);

  useEffect(() => {
    if (!usuario) return undefined;
    void enviar({
      tipo: 'NAVEGACAO',
      pagina: location.pathname,
      descricao: `Abriu a página ${location.pathname}.`,
      detalhes: { pesquisa: location.search ? 'Página com filtros de consulta' : undefined },
    });
    return undefined;
  }, [usuario, location.pathname, location.search]);

  useEffect(() => {
    if (!usuario) return undefined;

    ultimoCiclo.current = performance.now();

    const heartbeat = () => api.post('/auditoria/heartbeat').catch(() => {});
    void heartbeat();
    const intervaloHeartbeat = window.setInterval(heartbeat, 60_000);

    const registrarErro = (event) => {
      void enviar({
        tipo: 'ERRO_FRONTEND',
        pagina: window.location.pathname,
        descricao: event.message || 'Erro não tratado na interface.',
        detalhes: {
          arquivo: event.filename,
          linha: event.lineno,
          coluna: event.colno,
          erro: event.error?.stack || event.error?.message,
        },
      });
    };

    const registrarRejeicao = (event) => {
      const motivo = event.reason;
      void enviar({
        tipo: 'REJEICAO_NAO_TRATADA',
        pagina: window.location.pathname,
        descricao: motivo?.message || String(motivo || 'Falha não tratada na interface.'),
        detalhes: { erro: motivo?.stack || String(motivo || '') },
      });
    };

    const verificarResposta = () => {
      const agora = performance.now();
      const atraso = agora - ultimoCiclo.current - 5_000;
      ultimoCiclo.current = agora;
      if (document.visibilityState === 'visible' && atraso > 10_000) {
        void enviar({
          tipo: 'TRAVAMENTO_INTERFACE',
          pagina: window.location.pathname,
          descricao: 'A interface ficou temporariamente sem responder.',
          duracaoMs: Math.round(atraso),
          detalhes: { atrasoMs: Math.round(atraso) },
        });
      }
    };

    const reiniciarMedicao = () => {
      ultimoCiclo.current = performance.now();
      if (document.visibilityState === 'visible') void heartbeat();
    };

    const intervaloResposta = window.setInterval(verificarResposta, 5_000);
    window.addEventListener('error', registrarErro);
    window.addEventListener('unhandledrejection', registrarRejeicao);
    document.addEventListener('visibilitychange', reiniciarMedicao);

    return () => {
      window.clearInterval(intervaloHeartbeat);
      window.clearInterval(intervaloResposta);
      window.removeEventListener('error', registrarErro);
      window.removeEventListener('unhandledrejection', registrarRejeicao);
      document.removeEventListener('visibilitychange', reiniciarMedicao);
    };
  }, [usuario]);

  return null;
}
