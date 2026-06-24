// Model de Dupla — Operações no banco de dados
const prisma = require('../lib/prisma');
const { removerDuplasPorIds } = require('./cadastroDelete.model');

const DuplaModel = {
  // Lista duplas com filtro opcional
  async findAll(filtro = {}) {
    return prisma.dupla.findMany({
      where: filtro,
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        _count: { select: { estudosBiblicos: true, acompanhamentos: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  },

  // Busca dupla por ID
  async findById(id) {
    return prisma.dupla.findUnique({
      where: { id: Number(id) },
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        estudosBiblicos: true,
        _count: { select: { estudosBiblicos: true, acompanhamentos: true } },
      },
    });
  },

  // Cria nova dupla
  async create(data) {
    return prisma.dupla.create({
      data,
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        _count: { select: { estudosBiblicos: true, acompanhamentos: true } },
      },
    });
  },

  // Atualiza dupla por ID
  async update(id, data) {
    return prisma.dupla.update({
      where: { id: Number(id) },
      data,
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        _count: { select: { estudosBiblicos: true, acompanhamentos: true } },
      },
    });
  },

  // Remove dupla por ID
  async remove(id) {
    const duplaId = Number(id);
    return prisma.$transaction(async (tx) => {
      await removerDuplasPorIds(tx, [duplaId]);
      return { id: duplaId };
    });
  },
};

module.exports = DuplaModel;
