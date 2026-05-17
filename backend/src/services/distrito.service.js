// Service de Distrito — Regras de negócio
const DistritoModel = require('../models/distrito.model');

const DistritoService = {
  // Lista distritos com filtro por perfil
  async listar(usuario, query) {
    const { regiaoId, nome } = query;
    const { perfil, regiaoId: userRegiaoId, distritoId: userDistritoId } = usuario;

    const condicoes = [];

    // Restrição por perfil
    if (perfil === 'PASTOR_DISTRITAL' && userDistritoId) {
      condicoes.push({ id: userDistritoId });
    } else if (perfil === 'COORDENADOR_REGIONAL' && userRegiaoId) {
      condicoes.push({ regiaoId: userRegiaoId });
    }

    // Filtros opcionais da query
    if (regiaoId) condicoes.push({ regiaoId: Number(regiaoId) });
    if (nome) condicoes.push({ nome: { contains: nome, mode: 'insensitive' } });

    const where = condicoes.length === 0
      ? {}
      : condicoes.length === 1
        ? condicoes[0]
        : { AND: condicoes };

    return DistritoModel.findAll(where);
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
