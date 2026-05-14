// Controller de Relatório — Entrada e saída HTTP
const RelatorioService = require('../services/relatorio.service');

const RelatorioController = {
  // GET /api/relatorios/resumo
  async resumo(req, res) {
    try {
      const resultado = await RelatorioService.resumo();
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório.' });
    }
  },

  // GET /api/relatorios/por-regiao
  async porRegiao(req, res) {
    try {
      const resultado = await RelatorioService.porRegiao();
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório por região.' });
    }
  },

  // GET /api/relatorios/por-distrito/:distritoId
  async porDistrito(req, res) {
    try {
      const resultado = await RelatorioService.porDistrito(req.params.distritoId);
      res.json(resultado);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao gerar relatório do distrito.' });
    }
  },
};

module.exports = RelatorioController;
