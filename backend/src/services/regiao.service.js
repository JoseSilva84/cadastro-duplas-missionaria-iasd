const RegiaoModel = require('../models/regiao.model');
const { montarEscopo, validarRegiao } = require('./escopo.service');

const RegiaoService = {
  async listar(usuario) {
    const escopo = await montarEscopo(usuario);
    const regioes = await RegiaoModel.findAll();
    if (!escopo.regiao?.id) return regioes;
    return regioes.filter((regiao) => regiao.id === escopo.regiao.id);
  },

  async buscarPorId(id, usuario) {
    validarRegiao(usuario, id);
    const regiao = await RegiaoModel.findById(id);
    if (!regiao) {
      throw { status: 404, mensagem: 'Região não encontrada.' };
    }
    return regiao;
  },

  async criar(data) {
    return RegiaoModel.create(data);
  },

  async atualizar(id, data, usuario) {
    await this.buscarPorId(id, usuario);
    const campos = {};
    if (data.nome !== undefined) campos.nome = data.nome;
    if (data.descricao !== undefined) campos.descricao = data.descricao;
    if (data.cor !== undefined) campos.cor = data.cor;
    if (data.fotoConselheiro !== undefined) campos.fotoConselheiro = data.fotoConselheiro;
    if (data.nomeConselheiro !== undefined) campos.nomeConselheiro = data.nomeConselheiro;
    if (data.cargoConselheiro !== undefined) campos.cargoConselheiro = data.cargoConselheiro;
    if (data.telefoneConselheiro !== undefined) campos.telefoneConselheiro = data.telefoneConselheiro;
    if (data.enderecoConselheiro !== undefined) campos.enderecoConselheiro = data.enderecoConselheiro;
    if (data.dataNascimentoConselheiro !== undefined) {
      campos.dataNascimentoConselheiro = data.dataNascimentoConselheiro
        ? new Date(data.dataNascimentoConselheiro)
        : null;
    }
    return RegiaoModel.update(id, campos);
  },

  async remover(id) {
    await this.buscarPorId(id);
    return RegiaoModel.remove(id);
  },
};

module.exports = RegiaoService;
