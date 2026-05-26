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

  async porIgreja(igrejaId) {
    const resultado = await RelatorioModel.porIgreja(igrejaId);
    if (!resultado) {
      throw { status: 404, mensagem: 'Igreja nao encontrada.' };
    }
    return resultado;
  },

  async estudosBiblicos(query) {
    return RelatorioModel.estudosBiblicos(query);
  },

  async dashboardAssociacao() {
    return RelatorioModel.dashboardAssociacao();
  },

  async atualizarEscolaSabatinaResumo(data) {
    return RelatorioModel.atualizarEscolaSabatinaResumo(data);
  },

  async coordenadoresRegionais() {
    return RelatorioModel.coordenadoresRegionais();
  },
};

module.exports = RelatorioService;
