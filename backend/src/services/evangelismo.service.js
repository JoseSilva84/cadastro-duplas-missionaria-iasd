const EvangelismoModel = require('../models/evangelismo.model');
const { PERFIS } = require('../middlewares/auth');

// Aplica filtros de escopo por perfil + filtros opcionais da query
const montarFiltro = (query = {}, usuario = null) => {
  const where = {};

  // ─── Restrições por perfil ──────────────────────────────────────────────────
  if (usuario) {
    const { perfil, duplaId, distritoId, regiaoId } = usuario;

    if (perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (!duplaId) throw { status: 403, mensagem: 'Dupla não vinculada a este usuário.' };
      where.duplaId = duplaId;
    } else if (perfil === PERFIS.PASTOR_DISTRITAL && distritoId) {
      where.dupla = { is: { distritoId } };
    } else if (
      (perfil === PERFIS.PASTOR_REGIONAL || perfil === PERFIS.COORDENADOR_REGIONAL) &&
      regiaoId
    ) {
      where.dupla = { is: { distrito: { is: { regiaoId } } } };
    }
    // SUPER_ADMIN e ADMINISTRADOR: sem restrição
  }

  // ─── Filtros opcionais (ignorados para DUPLA_MISSIONARIA) ──────────────────
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
    if (!evangelismo) throw { status: 404, mensagem: 'Registro de evangelismo não encontrado.' };

    // DUPLA_MISSIONARIA só vê registros da própria dupla
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (evangelismo.duplaId !== usuario.duplaId) {
        throw { status: 403, mensagem: 'Acesso negado: registro pertence a outra dupla.' };
      }
    }
    return evangelismo;
  },

  // Criação com validação de escopo para DUPLA_MISSIONARIA
  async criar(data, usuario) {
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (Number(data.duplaId) !== usuario.duplaId) {
        throw { status: 403, mensagem: 'Você só pode cadastrar registros para a sua própria dupla.' };
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
