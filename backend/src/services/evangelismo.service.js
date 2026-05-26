const EvangelismoModel = require('../models/evangelismo.model');
const { PERFIS } = require('../middlewares/auth');

// Aplica filtros de escopo por perfil + filtros opcionais da query
const montarFiltro = (query = {}, usuario = null) => {
  const where = {};

  // â”€â”€â”€ RestriÃ§Ãµes por perfil â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (usuario) {
    const { perfil, duplaId, distritoId, regiaoId } = usuario;

    if (perfil === PERFIS.DUPLA_MISSIONARIA) {
      // Conta vinculada ve somente a propria dupla; conta unificada ve todas.
      if (duplaId) where.duplaId = duplaId;
    } else if (perfil === PERFIS.PASTOR_DISTRITAL && distritoId) {
      where.dupla = { is: { distritoId } };
    } else if (
      (perfil === PERFIS.PASTOR_REGIONAL || perfil === PERFIS.COORDENADOR_REGIONAL) &&
      regiaoId
    ) {
      where.dupla = { is: { distrito: { is: { regiaoId } } } };
    }
    // SUPER_ADMIN e ADMINISTRADOR: sem restriÃ§Ã£o
  }

  // â”€â”€â”€ Filtros opcionais (ignorados para DUPLA_MISSIONARIA) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!usuario || usuario.perfil !== PERFIS.DUPLA_MISSIONARIA) {
    if (query.duplaId) where.duplaId = Number(query.duplaId);
  }
  if (query.serie) where.serie = query.serie;
  if (query.estudoAtual) where.estudoAtual = Number(query.estudoAtual);
  if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };
  if (query.dataInicio || query.dataFim) {
    where.criadoEm = {};
    if (query.dataInicio) where.criadoEm.gte = new Date(query.dataInicio);
    if (query.dataFim) where.criadoEm.lte = new Date(`${query.dataFim}T23:59:59.999Z`);
  }

  return where;
};

const normalizar = (data) => ({
  nomePessoa: data.nomePessoa,
  endereco: data.endereco,
  cidade: data.cidade,
  estado: data.estado,
  whatsapp: data.whatsapp,
  diaEvangelismo: data.diaEvangelismo,
  duplaId: Number(data.duplaId),
  serie: data.serie,
  estudoAtual: Number(data.estudoAtual),
});

const EvangelismoService = {
  listar(query, usuario) {
    return EvangelismoModel.findAll(montarFiltro(query, usuario));
  },

  async buscarPorId(id, usuario) {
    const evangelismo = await EvangelismoModel.findById(id);
    if (!evangelismo) throw { status: 404, mensagem: 'Registro de evangelismo nÃ£o encontrado.' };

    // DUPLA_MISSIONARIA sÃ³ vÃª registros da prÃ³pria dupla
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (usuario.duplaId && evangelismo.duplaId !== usuario.duplaId) {
        throw { status: 403, mensagem: 'Acesso negado: registro pertence a outra dupla.' };
      }
    }
    return evangelismo;
  },

  // CriaÃ§Ã£o com validaÃ§Ã£o de escopo para DUPLA_MISSIONARIA
  async criar(data, usuario) {
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (usuario.duplaId && Number(data.duplaId) !== usuario.duplaId) {
        throw { status: 403, mensagem: 'VocÃª sÃ³ pode cadastrar registros para a sua prÃ³pria dupla.' };
      }
    }
    return EvangelismoModel.create(normalizar(data));
  },

  async atualizar(id, data, usuario) {
    await this.buscarPorId(id, usuario);
    return EvangelismoModel.update(id, normalizar(data));
  },

  async remover(id, usuario) {
    await this.buscarPorId(id, usuario);
    return EvangelismoModel.remove(id);
  },
};

module.exports = EvangelismoService;
