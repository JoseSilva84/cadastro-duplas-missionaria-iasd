const EscolaSabatinaModel = require('../models/escolaSabatina.model');
const { montarEscopo, combinar, validarIgreja } = require('./escopo.service');
const { PERFIS } = require('../middlewares/auth');

const inteiro = (valor) => Math.max(Number(valor || 0), 0);

const aplicarEscopo = async (usuario, condicoes) => {
  const escopo = await montarEscopo(usuario);
  condicoes.push(escopo.escolaSabatina);
};

const EscolaSabatinaService = {
  async listar(usuario, query = {}) {
    const condicoes = [];
    await aplicarEscopo(usuario, condicoes);

    if (query.distritoId) condicoes.push({ distritoId: Number(query.distritoId) });
    if (query.igrejaId) condicoes.push({ igrejaId: Number(query.igrejaId) });

    return EscolaSabatinaModel.listar(combinar(...condicoes));
  },

  async buscarPorId(id, usuario) {
    const cadastro = await EscolaSabatinaModel.buscarPorId(id);
    if (!cadastro) {
      throw { status: 404, mensagem: 'Cadastro da Escola Sabatina nao encontrado.' };
    }
    await validarIgreja(usuario, cadastro.igrejaId);
    return cadastro;
  },

  async atualizar(id, data, usuario) {
    const cadastro = await this.buscarPorId(id, usuario);
    if (usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA
      && cadastro.criadoPorId && Number(cadastro.criadoPorId) !== Number(usuario.id)) {
      throw { status: 403, mensagem: 'Acesso negado: este cadastro foi realizado por outro usuário.' };
    }

    const distritoId = Number(data.distritoId);
    const igrejaId = Number(data.igrejaId);
    const duplaIds = [...new Set((data.duplaIds || []).map(Number).filter(Boolean))];
    const igreja = await EscolaSabatinaModel.buscarIgreja(igrejaId);
    if (!igreja || igreja.distritoId !== distritoId) {
      throw { status: 400, mensagem: 'A igreja selecionada nao pertence ao distrito informado.' };
    }
    await validarIgreja(usuario, igrejaId);
    const duplas = await EscolaSabatinaModel.buscarDuplas(duplaIds);
    if (!duplaIds.length || duplas.length !== duplaIds.length
      || duplas.some((dupla) => dupla.distritoId !== distritoId || dupla.igrejaId !== igrejaId)) {
      throw { status: 400, mensagem: 'Selecione apenas duplas da igreja e distrito informados.' };
    }

    return EscolaSabatinaModel.atualizar(id, {
      distritoId,
      igrejaId,
      unidadesAcao: inteiro(data.unidadesAcao),
      classeProfessores: inteiro(data.classeProfessores),
      classeInteressados: inteiro(data.classeInteressados),
      visitasDiretores: inteiro(data.visitasDiretores),
      visitasProfessores: inteiro(data.visitasProfessores),
      visitasAlunos: inteiro(data.visitasAlunos),
      quantidadePequenosGrupos: inteiro(data.quantidadePequenosGrupos),
      observacoes: data.observacoes || null,
    }, duplaIds);
  },

  async criar(data, usuario) {
    const distritoId = Number(data.distritoId);
    const igrejaId = Number(data.igrejaId);
    const duplaIds = [...new Set((data.duplaIds || []).map(Number).filter(Boolean))];

    const igreja = await EscolaSabatinaModel.buscarIgreja(igrejaId);
    if (!igreja || igreja.distritoId !== distritoId) {
      throw { status: 400, mensagem: 'A igreja selecionada nao pertence ao distrito informado.' };
    }
    await validarIgreja(usuario, igrejaId);

    if (duplaIds.length === 0) {
      throw { status: 400, mensagem: 'Selecione ao menos uma dupla da igreja.' };
    }

    const duplas = await EscolaSabatinaModel.buscarDuplas(duplaIds);
    if (duplas.length !== duplaIds.length) {
      throw { status: 400, mensagem: 'Uma ou mais duplas selecionadas nao foram encontradas.' };
    }

    const foraDaIgreja = duplas.some((dupla) => dupla.distritoId !== distritoId || dupla.igrejaId !== igrejaId);
    if (foraDaIgreja) {
      throw { status: 400, mensagem: 'Selecione apenas duplas da igreja e distrito informados.' };
    }

    const quantidadePequenosGrupos = data.quantidadePequenosGrupos !== undefined
      ? inteiro(data.quantidadePequenosGrupos)
      : duplas.filter((dupla) => dupla.tipoProjeto === 'PEQUENOS_GRUPOS').length;

    return EscolaSabatinaModel.criar({
      distritoId,
      igrejaId,
      unidadesAcao: inteiro(data.unidadesAcao),
      classeProfessores: inteiro(data.classeProfessores),
      classeInteressados: inteiro(data.classeInteressados),
      visitasDiretores: inteiro(data.visitasDiretores),
      visitasProfessores: inteiro(data.visitasProfessores),
      visitasAlunos: inteiro(data.visitasAlunos),
      quantidadePequenosGrupos,
      observacoes: data.observacoes || null,
      criadoPorId: usuario.id || null,
    }, duplaIds);
  },

  async remover(id, usuario) {
    const cadastro = await this.buscarPorId(id, usuario);
    if (usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA
      && cadastro.criadoPorId && Number(cadastro.criadoPorId) !== Number(usuario.id)) {
      throw { status: 403, mensagem: 'Acesso negado: este cadastro foi realizado por outro usuário.' };
    }
    return EscolaSabatinaModel.remover(id);
  },
};

module.exports = EscolaSabatinaService;
