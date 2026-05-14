// Service de Relatório — Regras de negócio
const RelatorioModel = require('../models/relatorio.model');

const RelatorioService = {
  // Resumo geral do sistema
  async resumo() {
    return RelatorioModel.resumo();
  },

  // Duplas agrupadas por região
  async porRegiao() {
    return RelatorioModel.porRegiao();
  },

  // Relatório de um distrito específico
  async porDistrito(distritoId) {
    const resultado = await RelatorioModel.porDistrito(distritoId);
    if (!resultado) {
      throw { status: 404, mensagem: 'Distrito não encontrado.' };
    }
    return resultado;
  },
};

module.exports = RelatorioService;
