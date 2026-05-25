const EstudoBiblicoModel = require('../models/estudoBiblico.model');
const prisma = require('../lib/prisma');

const montarFiltro = (query = {}) => {
  const where = {};
  if (query.duplaId) where.duplaId = Number(query.duplaId);
  if (query.serie) where.serie = query.serie;
  if (query.licaoAtual) where.licaoAtual = Number(query.licaoAtual);
  if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };
  if (query.tipoEstudo) where.tipoEstudo = query.tipoEstudo;
  if (query.classificacaoInteressado) where.classificacaoInteressado = query.classificacaoInteressado;
  if (query.dataInicio || query.dataFim) {
    where.criadoEm = {};
    if (query.dataInicio) where.criadoEm.gte = new Date(query.dataInicio);
    if (query.dataFim) where.criadoEm.lte = new Date(`${query.dataFim}T23:59:59.999Z`);
  }
  return where;
};

// Normaliza os dados do estudo bíblico para persistência
const normalizarEstudo = (data) => ({
  nomeEstudante: data.nomeEstudante,
  endereco: data.endereco,
  cidade: data.cidade,
  estado: data.estado,
  whatsapp: data.whatsapp,
  diaEstudo: data.diaEstudo,
  horarioEstudo: data.horarioEstudo || null,
  duplaId: Number(data.duplaId),
  serie: data.serie,
  licaoAtual: Number(data.licaoAtual),
  // Fase 2 — novos campos
  tipoEstudo: data.tipoEstudo || 'UNICO',
  sexo: data.sexo || null,
  classificacaoInteressado: data.classificacaoInteressado || null,
  motivoImpedimento: data.motivoImpedimento || null,
  vaIgreja: data.vaIgreja !== undefined ? Boolean(data.vaIgreja) : null,
  leBiblia: data.leBiblia !== undefined ? Boolean(data.leBiblia) : null,
  estudaLicao: data.estudaLicao !== undefined ? Boolean(data.estudaLicao) : null,
  devolveDizimos: data.devolveDizimos !== undefined ? Boolean(data.devolveDizimos) : null,
  cultoFamiliar: data.cultoFamiliar !== undefined ? Boolean(data.cultoFamiliar) : null,
  observacoes: data.observacoes || null,
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

  // Criação com suporte a participantes (PONTO/CLASSE)
  async criar(data) {
    const dadosEstudo = normalizarEstudo(data);
    const participantes = data.participantes || [];

    // Se for PONTO ou CLASSE e tiver participantes, cria em transação
    if ((dadosEstudo.tipoEstudo === 'PONTO' || dadosEstudo.tipoEstudo === 'CLASSE') && participantes.length > 0) {
      return prisma.$transaction(async (tx) => {
        const estudo = await tx.estudoBiblico.create({
          data: {
            ...dadosEstudo,
            participantes: {
              create: participantes.map((p) => ({
                nome: p.nome,
                whatsapp: p.whatsapp || null,
                sexo: p.sexo || null,
                endereco: p.endereco || null,
                classificacaoInteressado: p.classificacaoInteressado || null,
                motivoImpedimento: p.motivoImpedimento || null,
              })),
            },
          },
          include: {
            dupla: {
              select: {
                id: true,
                liderNome: true,
                membro2Nome: true,
                bairro: true,
                distrito: { select: { nome: true, regiao: { select: { nome: true } } } },
              },
            },
            participantes: true,
          },
        });
        return estudo;
      });
    }

    return EstudoBiblicoModel.create(dadosEstudo);
  },

  // Atualização com suporte a participantes
  async atualizar(id, data) {
    await this.buscarPorId(id);
    const dadosEstudo = normalizarEstudo(data);
    const participantes = data.participantes;

    // Se veio lista de participantes, recria (delete+create)
    if (participantes !== undefined) {
      return prisma.$transaction(async (tx) => {
        // Remove participantes antigos
        await tx.participante.deleteMany({ where: { estudoBiblicoId: Number(id) } });

        return tx.estudoBiblico.update({
          where: { id: Number(id) },
          data: {
            ...dadosEstudo,
            participantes: {
              create: participantes.map((p) => ({
                nome: p.nome,
                whatsapp: p.whatsapp || null,
                sexo: p.sexo || null,
                endereco: p.endereco || null,
                classificacaoInteressado: p.classificacaoInteressado || null,
                motivoImpedimento: p.motivoImpedimento || null,
              })),
            },
          },
          include: {
            dupla: {
              select: {
                id: true,
                liderNome: true,
                membro2Nome: true,
                bairro: true,
                distrito: { select: { nome: true, regiao: { select: { nome: true } } } },
              },
            },
            participantes: true,
          },
        });
      });
    }

    return EstudoBiblicoModel.update(id, dadosEstudo);
  },

  async remover(id) {
    await this.buscarPorId(id);
    return EstudoBiblicoModel.remove(id);
  },
};

module.exports = EstudoBiblicoService;
