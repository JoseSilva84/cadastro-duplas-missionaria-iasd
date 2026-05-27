const EvangelismoModel = require('../models/evangelismo.model');
const prisma = require('../lib/prisma');
const { PERFIS } = require('../middlewares/auth');
const { montarEscopo, validarDistrito, validarIgreja } = require('./escopo.service');

const montarFiltro = async (query = {}, usuario = null) => {
  let where = {};

  if (usuario) {
    const escopo = await montarEscopo(usuario);
    where = { ...where, ...escopo.estudo };
  }

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

async function validarDuplaDoRegistro(usuario, duplaId) {
  if (!usuario) return;
  const dupla = await prisma.dupla.findUnique({
    where: { id: Number(duplaId) },
    select: { igrejaId: true },
  });
  if (!dupla) throw { status: 404, mensagem: 'Dupla não encontrada.' };
  await validarIgreja(usuario, dupla.igrejaId);
}

const EvangelismoService = {
  async listar(query, usuario) {
    return EvangelismoModel.findAll(await montarFiltro(query, usuario));
  },

  async buscarPorId(id, usuario) {
    const evangelismo = await EvangelismoModel.findById(id);
    if (!evangelismo) throw { status: 404, mensagem: 'Registro de evangelismo não encontrado.' };

    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      const escopo = await montarEscopo(usuario);
      if (evangelismo.dupla?.igreja?.id !== escopo.igrejaId) {
        throw { status: 403, mensagem: 'Acesso negado: registro pertence a outra igreja.' };
      }
    } else if (usuario && evangelismo.dupla?.igreja?.id) {
      await validarIgreja(usuario, evangelismo.dupla.igreja.id);
    } else if (usuario && evangelismo.dupla?.distrito?.id) {
      await validarDistrito(usuario, evangelismo.dupla.distrito.id);
    }
    return evangelismo;
  },

  async criar(data, usuario) {
    await validarDuplaDoRegistro(usuario, data.duplaId);
    return EvangelismoModel.create(normalizar(data));
  },

  async atualizar(id, data, usuario) {
    await this.buscarPorId(id, usuario);
    await validarDuplaDoRegistro(usuario, data.duplaId);
    return EvangelismoModel.update(id, normalizar(data));
  },

  async remover(id, usuario) {
    await this.buscarPorId(id, usuario);
    return EvangelismoModel.remove(id);
  },
};

module.exports = EvangelismoService;
