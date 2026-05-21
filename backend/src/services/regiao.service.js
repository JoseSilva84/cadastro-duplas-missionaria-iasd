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

  // Atualiza região (suporta update parcial via PATCH)
  async atualizar(id, data) {
    await this.buscarPorId(id);
    const campos = {};
    if (data.nome !== undefined)             campos.nome = data.nome;
    if (data.descricao !== undefined)        campos.descricao = data.descricao;
    if (data.cor !== undefined)              campos.cor = data.cor;
    if (data.fotoConselheiro !== undefined)  campos.fotoConselheiro = data.fotoConselheiro;
    if (data.nomeConselheiro !== undefined)  campos.nomeConselheiro = data.nomeConselheiro;
    if (data.cargoConselheiro !== undefined) campos.cargoConselheiro = data.cargoConselheiro;
    return RegiaoModel.update(id, campos);
  },

  // Remove região
  async remover(id) {
    await this.buscarPorId(id);
    return RegiaoModel.remove(id);
  },
};

module.exports = RegiaoService;
