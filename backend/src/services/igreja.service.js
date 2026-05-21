// Service de Igreja — Regras de negócio
const IgrejaModel = require('../models/igreja.model');

const IgrejaService = {
  // Lista todas as igrejas aplicando restrições de acesso
  async listar(usuario, query) {
    const condicoes = [];

    // Restrição por perfil — define o escopo máximo permitido
    if (usuario.perfil === 'COORDENADOR_REGIONAL' && usuario.regiaoId) {
      // Prisma exige "is" para filtrar campos de uma relação
      condicoes.push({ distrito: { is: { regiaoId: usuario.regiaoId } } });
    } else if (usuario.perfil === 'PASTOR_DISTRITAL' && usuario.distritoId) {
      condicoes.push({ distritoId: usuario.distritoId });
    } else if (usuario.perfil === 'LIDER_LOCAL' && usuario.igrejaId) {
      condicoes.push({ id: usuario.igrejaId });
    }

    // Filtros opcionais da query (refinam dentro do escopo permitido)
    if (query.distritoId) condicoes.push({ distritoId: Number(query.distritoId) });
    if (query.regiaoId) condicoes.push({ distrito: { is: { regiaoId: Number(query.regiaoId) } } });

    // Combina tudo com AND sem conflitos
    const where = condicoes.length === 0
      ? {}
      : condicoes.length === 1
        ? condicoes[0]
        : { AND: condicoes };

    return IgrejaModel.findAll(where);
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

  // Atualiza igreja (suporta update parcial via PATCH)
  async atualizar(id, data) {
    await this.buscarPorId(id);
    const campos = {};
    if (data.nome !== undefined)                    campos.nome = data.nome;
    if (data.membros !== undefined)                 campos.membros = Number(data.membros);
    if (data.distritoId !== undefined)              campos.distritoId = Number(data.distritoId);
    if (data.fotoCoordInteressados !== undefined)   campos.fotoCoordInteressados = data.fotoCoordInteressados;
    if (data.nomeCoordInteressados !== undefined)   campos.nomeCoordInteressados = data.nomeCoordInteressados;
    if (data.cargoCoordInteressados !== undefined)  campos.cargoCoordInteressados = data.cargoCoordInteressados;
    return IgrejaModel.update(id, campos);
  },
};

module.exports = IgrejaService;
