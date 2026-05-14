// Service de Região — Regras de negócio
const RegiaoModel = require('../models/regiao.model');

const RegiaoService = {
  // Lista todas as regiões
  async listar() {
    return RegiaoModel.findAll();
  },

  // Busca região por ID
  async buscarPorId(id) {
    const regiao = await RegiaoModel.findById(id);
    if (!regiao) {
      throw { status: 404, mensagem: 'Região não encontrada.' };
    }
    return regiao;
  },

  // Cria nova região
  async criar(data) {
    return RegiaoModel.create(data);
  },

  // Atualiza região
  async atualizar(id, data) {
    await this.buscarPorId(id);
    return RegiaoModel.update(id, data);
  },

  // Remove região
  async remover(id) {
    await this.buscarPorId(id);
    return RegiaoModel.remove(id);
  },
};

module.exports = RegiaoService;
