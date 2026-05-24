const EscolaSabatinaModel = require('../models/escolaSabatina.model');

const inteiro = (valor) => Math.max(Number(valor || 0), 0);

const aplicarEscopo = (usuario, condicoes) => {
  if (usuario.perfil === 'PASTOR_DISTRITAL' && usuario.distritoId) {
    condicoes.push({ distritoId: usuario.distritoId });
  } else if (usuario.perfil === 'COORDENADOR_REGIONAL' && usuario.regiaoId) {
    condicoes.push({ distrito: { is: { regiaoId: usuario.regiaoId } } });
  }
};

const EscolaSabatinaService = {
  async listar(usuario, query = {}) {
    const condicoes = [];
    aplicarEscopo(usuario, condicoes);

    if (query.distritoId) condicoes.push({ distritoId: Number(query.distritoId) });
    if (query.igrejaId) condicoes.push({ igrejaId: Number(query.igrejaId) });

    const where = condicoes.length === 0
      ? {}
      : condicoes.length === 1
        ? condicoes[0]
        : { AND: condicoes };

    return EscolaSabatinaModel.listar(where);
  },

  async criar(data, usuario) {
    const distritoId = Number(data.distritoId);
    const igrejaId = Number(data.igrejaId);
    const duplaIds = [...new Set((data.duplaIds || []).map(Number).filter(Boolean))];

    if (usuario.perfil === 'PASTOR_DISTRITAL' && usuario.distritoId !== distritoId) {
      throw { status: 403, mensagem: 'Sem permissao para cadastrar Escola Sabatina neste distrito.' };
    }

    const igreja = await EscolaSabatinaModel.buscarIgreja(igrejaId);
    if (!igreja || igreja.distritoId !== distritoId) {
      throw { status: 400, mensagem: 'A igreja selecionada nao pertence ao distrito informado.' };
    }

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
};

module.exports = EscolaSabatinaService;
