const RegiaoModel = require('../models/regiao.model');
const { montarEscopo, validarRegiao } = require('./escopo.service');
const { registrarAtividade } = require('./notificacoesAtividade.service');

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

  async criar(data, usuario) {
    const regiao = await RegiaoModel.create(data);
    await registrarAtividade({
      ator: usuario, regiaoId: regiao.id, titulo: 'Nova região cadastrada',
      mensagem: `A região ${regiao.nome} foi cadastrada.`, url: '/regioes',
    });
    return regiao;
  },

  async atualizar(id, data, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
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
    const atualizada = await RegiaoModel.update(id, campos);
    const relevantes = ['nome', 'descricao', 'nomeConselheiro', 'cargoConselheiro', 'telefoneConselheiro', 'enderecoConselheiro'];
    if (relevantes.some((campo) => anterior[campo] !== atualizada[campo])) {
      await registrarAtividade({
        ator: usuario, regiaoId: atualizada.id, titulo: 'Dados da região atualizados',
        mensagem: `Os dados da região ${atualizada.nome} foram atualizados.`, url: '/regioes',
      });
    }
    return atualizada;
  },

  async remover(id, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
    const removida = await RegiaoModel.remove(id);
    await registrarAtividade({
      ator: usuario, regiaoId: anterior.id, titulo: 'Região removida',
      mensagem: `A região ${anterior.nome} foi removida.`, url: '/regioes',
    });
    return removida;
  },
};

module.exports = RegiaoService;
