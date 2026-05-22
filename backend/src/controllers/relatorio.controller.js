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

  // GET /api/relatorios/estudos-biblicos
  async estudosBiblicos(req, res) {
    try {
      const resultado = await RelatorioService.estudosBiblicos(req.query);
      res.json(resultado);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao gerar relatório de estudos bíblicos.' });
    }
  },

  // GET /api/relatorios/dashboard-associacao
  async dashboardAssociacao(req, res) {
    try {
      const resultado = await RelatorioService.dashboardAssociacao();
      res.json(resultado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao gerar dashboard da associacao.' });
    }
  },

  // PATCH /api/relatorios/escola-sabatina-resumo
  async atualizarEscolaSabatinaResumo(req, res) {
    try {
      const resultado = await RelatorioService.atualizarEscolaSabatinaResumo(req.body);
      res.json(resultado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao atualizar resumo da Escola Sabatina.' });
    }
  },
};

module.exports = RelatorioController;
