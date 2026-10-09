const AuditoriaService = require('../services/auditoria.service');

const ROTAS_IGNORADAS = new Set([
  '/api/health',
  '/api/auditoria/heartbeat',
  '/api/auditoria/logout',
  '/api/auditoria/cliente',
  '/api/auth/login',
]);

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
