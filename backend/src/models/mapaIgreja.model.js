const prisma = require('../lib/prisma');

const includeMapa = {
  igreja: {
    include: {
      distrito: { include: { regiao: true } },
      _count: { select: { duplas: true } },
    },
  },
  criadoPor: { select: { id: true, nome: true, perfil: true } },
};

const MapaIgrejaModel = {
  listar(where = {}) {
    return prisma.mapaIgreja.findMany({
      where,
      include: includeMapa,
      orderBy: { atualizadoEm: 'desc' },
    });
  },

  buscarPorIgreja(igrejaId) {
    return prisma.mapaIgreja.findUnique({
      where: { igrejaId: Number(igrejaId) },
      include: includeMapa,
    });
  },

  buscarPorId(id) {
    return prisma.mapaIgreja.findUnique({
      where: { id: Number(id) },
      include: includeMapa,
    });
  },

  buscarIgreja(igrejaId) {
    return prisma.igreja.findUnique({
      where: { id: Number(igrejaId) },
      include: {
        distrito: { include: { regiao: true } },
        _count: { select: { duplas: true } },
      },
    });
  },

  salvar(igrejaId, data) {
    return prisma.mapaIgreja.upsert({
      where: { igrejaId: Number(igrejaId) },
      create: { ...data, igrejaId: Number(igrejaId) },
      update: data,
      include: includeMapa,
    });
  },

  remover(id) {
    return prisma.mapaIgreja.delete({ where: { id: Number(id) } });
  },
};

module.exports = MapaIgrejaModel;
