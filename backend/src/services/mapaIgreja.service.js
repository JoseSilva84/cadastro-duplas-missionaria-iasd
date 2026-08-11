const MapaIgrejaModel = require('../models/mapaIgreja.model');
const { montarEscopo, combinar, validarIgreja } = require('./escopo.service');
const { PERFIS } = require('../middlewares/auth');

const inteiro = (valor) => Math.max(Number(valor || 0), 0);
const texto = (valor) => {
  const normalizado = String(valor || '').trim();
  return normalizado || null;
};

const anoValido = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const ano = Number(valor);
  const anoAtual = new Date().getFullYear();
  if (!Number.isInteger(ano) || ano < 1800 || ano > anoAtual + 1) {
    throw { status: 400, mensagem: 'Informe um ano valido para a organizacao da igreja.' };
  }
  return ano;
};

const dataOuNull = (valor) => {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) {
    throw { status: 400, mensagem: 'Informe uma data valida para o evangelismo de colheita.' };
  }
  return data;
};

const normalizarAcoes = (acoes = []) => (
  Array.isArray(acoes)
    ? acoes.map((acao) => ({
      nome: texto(acao.nome),
      responsavel: texto(acao.responsavel),
      data: acao.data || null,
    })).filter((acao) => acao.nome)
    : []
);

const dadosAutomaticos = (igreja, usuario) => ({
  pastorNome: igreja?.distrito?.nomePastor || (usuario?.perfil === PERFIS.PASTOR_DISTRITAL ? usuario.nome : '') || '',
  diretorMissionarioNome: igreja?.nomeDiretorMinisterioPessoal || (usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA ? usuario.nome : '') || '',
  membros: igreja?.membros || 0,
  quantidadeDuplasMissionarias: igreja?._count?.duplas || 0,
});

const MapaIgrejaService = {
  async listar(usuario, query = {}) {
    const escopo = await montarEscopo(usuario);
    const condicoes = [];
    if (escopo.igreja && Object.keys(escopo.igreja).length > 0) {
      condicoes.push({ igreja: { is: escopo.igreja } });
    }
    if (query.igrejaId) condicoes.push({ igrejaId: Number(query.igrejaId) });
    return MapaIgrejaModel.listar(combinar(...condicoes));
  },

  async base(usuario, igrejaId) {
    await validarIgreja(usuario, igrejaId);
    const [igreja, mapa] = await Promise.all([
      MapaIgrejaModel.buscarIgreja(igrejaId),
      MapaIgrejaModel.buscarPorIgreja(igrejaId),
    ]);
    if (!igreja) throw { status: 404, mensagem: 'Igreja nao encontrada.' };
    return { igreja, mapa, automatico: dadosAutomaticos(igreja, usuario) };
  },

  async salvar(usuario, data = {}) {
    const igrejaId = Number(data.igrejaId);
    if (!igrejaId) throw { status: 400, mensagem: 'Igreja obrigatoria.' };
    await validarIgreja(usuario, igrejaId);

    const igreja = await MapaIgrejaModel.buscarIgreja(igrejaId);
    if (!igreja) throw { status: 404, mensagem: 'Igreja nao encontrada.' };

    const payload = {
      pastorNome: texto(data.pastorNome) || dadosAutomaticos(igreja, usuario).pastorNome || null,
      diretorMissionarioNome: texto(data.diretorMissionarioNome) || dadosAutomaticos(igreja, usuario).diretorMissionarioNome || null,
      primeiroAnciaoNome: texto(data.primeiroAnciaoNome),
      anoOrganizacao: anoValido(data.anoOrganizacao),
      quantidadePequenosGrupos: inteiro(data.quantidadePequenosGrupos),
      semanaSanta: inteiro(data.semanaSanta),
      classeBiblica: inteiro(data.classeBiblica),
      aventureiros: inteiro(data.aventureiros),
      desbravadores: inteiro(data.desbravadores),
      acoesMissionarias: normalizarAcoes(data.acoesMissionarias),
      dataEvangelismoColheita: dataOuNull(data.dataEvangelismoColheita),
      criadoPorId: usuario?.id || null,
    };

    return MapaIgrejaModel.salvar(igrejaId, payload);
  },
};

module.exports = MapaIgrejaService;
