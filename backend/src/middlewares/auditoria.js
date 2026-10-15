const AuditoriaService = require('../services/auditoria.service');

const ROTAS_IGNORADAS = new Set([
  '/api/health',
  '/api/auditoria/heartbeat',
  '/api/auditoria/logout',
  '/api/auditoria/cliente',
  '/api/auth/login',
]);

// Evita transformar atualizações automáticas e cliques repetidos em centenas de
// gravações iguais. Alterações e falhas continuam sendo registradas sempre.
const consultasRecentes = new Map();
const JANELA_CONSULTA_MS = 15_000;

const deveRegistrar = (req, rota, statusHttp) => {
  if (String(req.method).toUpperCase() !== 'GET' || statusHttp >= 400) return true;
  const identidade = req.sessaoId || req.usuario?.id || req.ip || 'anonimo';
  const chave = `${identidade}:${rota}`;
  const agora = Date.now();
  const anterior = consultasRecentes.get(chave) || 0;
  consultasRecentes.set(chave, agora);

  if (consultasRecentes.size > 5_000) {
    const limite = agora - (JANELA_CONSULTA_MS * 4);
    consultasRecentes.forEach((instante, item) => {
      if (instante < limite) consultasRecentes.delete(item);
    });
  }
  return agora - anterior >= JANELA_CONSULTA_MS;
};

const auditarRequisicao = (req, res, next) => {
  const inicio = process.hrtime.bigint();
  let erroResposta = null;
  const jsonOriginal = res.json.bind(res);

  res.json = (corpo) => {
    if (corpo && typeof corpo === 'object' && corpo.erro) erroResposta = String(corpo.erro);
    return jsonOriginal(corpo);
  };

  res.once('finish', () => {
    const rota = String(req.originalUrl || '').split('?')[0];
    if (!rota.startsWith('/api/') || ROTAS_IGNORADAS.has(rota)) return;
    if (!deveRegistrar(req, rota, res.statusCode)) return;
    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
    void AuditoriaService.registrarRequisicao({
      req,
      statusHttp: res.statusCode,
      duracaoMs,
      erro: erroResposta,
    }).catch((erroAuditoria) => console.error('Falha no middleware de auditoria:', erroAuditoria.message));
  });

  next();
};

module.exports = { auditarRequisicao };
