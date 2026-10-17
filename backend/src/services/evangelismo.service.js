const EvangelismoModel = require('../models/evangelismo.model');
const prisma = require('../lib/prisma');
const { PERFIS } = require('../middlewares/auth');
const { montarEscopo, validarDistrito, validarIgreja } = require('./escopo.service');
const { registrarAtividade } = require('./notificacoesAtividade.service');

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

const normalizar = (data, duplaIdPadrao = null) => ({
  nomePessoa: data.nomePessoa,
  endereco: data.endereco || 'Nao informado',
  cidade: data.cidade || 'Nao informada',
  estado: data.estado || 'SP',
  whatsapp: data.whatsapp,
  diaEvangelismo: data.diaEvangelismo || 'Nao informado',
  duplaId: Number(data.duplaId || duplaIdPadrao),
  serie: data.serie || 'Nao informado',
  estudoAtual: Number(data.estudoAtual || 1),
});

async function validarDuplaDoRegistro(usuario, duplaId) {
  if (!usuario) return;
  if (usuario.perfil === PERFIS.DUPLA_MISSIONARIA && Number(usuario.duplaId) !== Number(duplaId)) {
    throw { status: 403, mensagem: 'Acesso negado: esta não é a sua dupla.' };
  }
  const dupla = await prisma.dupla.findUnique({
    where: { id: Number(duplaId) },
    select: { igrejaId: true, distritoId: true },
  });
  if (!dupla) throw { status: 404, mensagem: 'Dupla não encontrada.' };
  if (!dupla.igrejaId && usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
    throw { status: 403, mensagem: 'Acesso negado: dupla sem igreja vinculada.' };
  }
  if (dupla.igrejaId) await validarIgreja(usuario, dupla.igrejaId);
  else await validarDistrito(usuario, dupla.distritoId);
}

async function obterDuplaPadrao(usuario) {
  const escopo = await montarEscopo(usuario);
  const dupla = await prisma.dupla.findFirst({
    where: escopo.dupla,
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (!dupla) throw { status: 400, mensagem: 'Nao ha dupla disponivel para vincular este cadastro.' };
  return dupla.id;
}

const EvangelismoService = {
  async listar(query, usuario) {
    return EvangelismoModel.findAll(await montarFiltro(query, usuario));
  },

  async buscarPorId(id, usuario) {
    const evangelismo = await EvangelismoModel.findById(id);
    if (!evangelismo) throw { status: 404, mensagem: 'Registro de evangelismo não encontrado.' };

    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (Number(evangelismo.duplaId) !== Number(usuario.duplaId)) {
        throw { status: 403, mensagem: 'Acesso negado: registro pertence a outra dupla.' };
      }
    } else if (usuario && evangelismo.dupla?.igreja?.id) {
      await validarIgreja(usuario, evangelismo.dupla.igreja.id);
    } else if (usuario && evangelismo.dupla?.distrito?.id) {
      if (usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
        throw { status: 403, mensagem: 'Acesso negado: registro sem igreja vinculada.' };
      }
      await validarDistrito(usuario, evangelismo.dupla.distrito.id);
    }
    return evangelismo;
  },

  async criar(data, usuario) {
    const duplaId = data.duplaId || await obterDuplaPadrao(usuario);
    await validarDuplaDoRegistro(usuario, duplaId);
    const registro = await EvangelismoModel.create(normalizar(data, duplaId));
    await registrarAtividade({
      ator: usuario, duplaId: registro.duplaId, titulo: 'Novo registro de evangelismo',
      mensagem: `Um acompanhamento de evangelismo para ${registro.nomePessoa} foi cadastrado.`,
      url: `/duplas/${registro.duplaId}`,
    });
    return registro;
  },

  async atualizar(id, data, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
    const duplaId = data.duplaId || anterior?.dupla?.id;
    await validarDuplaDoRegistro(usuario, duplaId);
    const atualizado = await EvangelismoModel.update(id, normalizar(data, duplaId));
    if (['nomePessoa', 'duplaId', 'serie', 'estudoAtual', 'diaEvangelismo', 'cidade', 'endereco']
      .some((campo) => anterior[campo] !== atualizado[campo])) {
      const titulo = anterior.estudoAtual !== atualizado.estudoAtual
        ? 'Etapa de evangelismo atualizada' : 'Registro de evangelismo atualizado';
      await registrarAtividade({
        ator: usuario, duplaId: atualizado.duplaId, titulo,
        mensagem: anterior.estudoAtual !== atualizado.estudoAtual
          ? `O acompanhamento de ${atualizado.nomePessoa} passou da etapa ${anterior.estudoAtual} para a ${atualizado.estudoAtual}.`
          : `O acompanhamento de ${atualizado.nomePessoa} foi atualizado.`,
        url: `/duplas/${atualizado.duplaId}`,
      });
    }
    return atualizado;
  },

  async remover(id, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
    const removido = await EvangelismoModel.remove(id);
    await registrarAtividade({
      ator: usuario, duplaId: anterior.duplaId, titulo: 'Registro de evangelismo removido',
      mensagem: `O acompanhamento de ${anterior.nomePessoa} foi removido.`,
      url: `/duplas/${anterior.duplaId}`,
    });
    return removido;
  },
};

module.exports = EvangelismoService;
