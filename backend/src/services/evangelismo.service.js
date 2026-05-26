const EvangelismoModel = require('../models/evangelismo.model');

const montarFiltro = (query = {}) => {
  const where = {};
  if (query.duplaId) where.duplaId = Number(query.duplaId);
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
  listar(query) {
    return EvangelismoModel.findAll(montarFiltro(query));
  },

  async buscarPorId(id) {
    const evangelismo = await EvangelismoModel.findById(id);
    if (!evangelismo) throw { status: 404, mensagem: 'Classe bíblica não encontrada.' };
    return evangelismo;
  },

  criar(data) {
    return EvangelismoModel.create(normalizar(data));
  },

  async atualizar(id, data) {
    await this.buscarPorId(id);
    return EvangelismoModel.update(id, normalizar(data));
  },

  async remover(id) {
    await this.buscarPorId(id);
    return EvangelismoModel.remove(id);
  },
};

module.exports = EvangelismoService;
