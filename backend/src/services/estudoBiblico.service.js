const EstudoBiblicoModel = require('../models/estudoBiblico.model');

const montarFiltro = (query = {}) => {
  const where = {};
  if (query.duplaId) where.duplaId = Number(query.duplaId);
  if (query.serie) where.serie = query.serie;
  if (query.licaoAtual) where.licaoAtual = Number(query.licaoAtual);
  if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };
  if (query.dataInicio || query.dataFim) {
    where.criadoEm = {};
    if (query.dataInicio) where.criadoEm.gte = new Date(query.dataInicio);
    if (query.dataFim) where.criadoEm.lte = new Date(`${query.dataFim}T23:59:59.999Z`);
  }
  return where;
};

const normalizar = (data) => ({
  nomeEstudante: data.nomeEstudante,
  endereco: data.endereco,
  cidade: data.cidade,
  estado: data.estado,
  whatsapp: data.whatsapp,
  diaEstudo: data.diaEstudo,
  duplaId: Number(data.duplaId),
  serie: data.serie,
  licaoAtual: Number(data.licaoAtual),
});

const EstudoBiblicoService = {
  listar(query) {
    return EstudoBiblicoModel.findAll(montarFiltro(query));
  },

  async buscarPorId(id) {
    const estudo = await EstudoBiblicoModel.findById(id);
    if (!estudo) throw { status: 404, mensagem: 'Estudo bíblico não encontrado.' };
    return estudo;
  },

  criar(data) {
    return EstudoBiblicoModel.create(normalizar(data));
  },

  async atualizar(id, data) {
    await this.buscarPorId(id);
    return EstudoBiblicoModel.update(id, normalizar(data));
  },

  async remover(id) {
    await this.buscarPorId(id);
    return EstudoBiblicoModel.remove(id);
  },
};

module.exports = EstudoBiblicoService;
