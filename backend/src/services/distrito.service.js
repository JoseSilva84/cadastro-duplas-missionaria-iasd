// Service de Distrito — Regras de negócio
const DistritoModel = require('../models/distrito.model');

const DistritoService = {
  // Lista distritos com filtro por perfil
  async listar(usuario, query) {
    const { regiaoId } = query;
    const { perfil, regiaoId: userRegiaoId, distritoId: userDistritoId } = usuario;

    const filtro = {};

    if (perfil === 'PASTOR_DISTRITAL') {
      filtro.id = userDistritoId;
    } else if (perfil === 'COORDENADOR_REGIONAL') {
      filtro.regiaoId = userRegiaoId;
    } else if (regiaoId) {
      filtro.regiaoId = Number(regiaoId);
    }

    return DistritoModel.findAll(filtro);
  },

  // Busca distrito por ID
  async buscarPorId(id) {
    const distrito = await DistritoModel.findById(id);
    if (!distrito) {
      throw { status: 404, mensagem: 'Distrito não encontrado.' };
    }
    return distrito;
  },

  // Cria novo distrito
  async criar(data) {
    return DistritoModel.create({
      nome: data.nome,
      regiaoId: Number(data.regiaoId),
    });
  },

  // Atualiza distrito
  async atualizar(id, data) {
    await this.buscarPorId(id);
    return DistritoModel.update(id, { nome: data.nome });
  },
};

module.exports = DistritoService;
