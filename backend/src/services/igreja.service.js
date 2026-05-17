// Service de Igreja — Regras de negócio
const IgrejaModel = require('../models/igreja.model');

const IgrejaService = {
  // Lista todas as igrejas aplicando restrições de acesso
  async listar(usuario, query) {
    const filtro = {};

    // Se houver query param, filtra
    if (query.distritoId) {
      filtro.distritoId = Number(query.distritoId);
    }
    if (query.regiaoId) {
      filtro.distrito = { regiaoId: Number(query.regiaoId) };
    }

    // Regras baseadas no perfil do usuário
    if (usuario.perfil === 'COORDENADOR_REGIONAL') {
      filtro.distrito = { regiaoId: usuario.regiaoId };
    } else if (usuario.perfil === 'PAISTOR_DISTRITAL' || usuario.perfil === 'LIDER_DISTRITAL') {
      filtro.distritoId = usuario.distritoId;
    } else if (usuario.perfil === 'LIDER_LOCAL') {
      filtro.id = usuario.igrejaId;
    }

    return IgrejaModel.findAll(filtro);
  },

  // Busca igreja por ID com validação
  async buscarPorId(id) {
    const igreja = await IgrejaModel.findById(id);
    if (!igreja) {
      throw { status: 404, mensagem: 'Igreja não encontrada.' };
    }
    return igreja;
  },

  // Cria nova igreja
  async criar(data) {
    return IgrejaModel.create(data);
  },

  // Atualiza igreja
  async atualizar(id, data) {
    await this.buscarPorId(id);
    return IgrejaModel.update(id, data);
  },
};

module.exports = IgrejaService;
