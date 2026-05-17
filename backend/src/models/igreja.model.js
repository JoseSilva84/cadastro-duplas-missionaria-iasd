// Model de Igreja — Operações no banco de dados
const prisma = require('../lib/prisma');

const IgrejaModel = {
  // Lista igrejas com filtro opcional
  async findAll(filtro = {}) {
    return prisma.igreja.findMany({
      where: filtro,
      include: {
        distrito: {
          include: { regiao: true }
        },
        _count: { select: { duplas: true } },
      },
      orderBy: { nome: 'asc' },
    });
  },

  // Busca igreja por ID
  async findById(id) {
    return prisma.igreja.findUnique({
      where: { id: Number(id) },
      include: {
        distrito: {
          include: { regiao: true }
        },
        duplas: {
          orderBy: { criadoEm: 'desc' },
        },
      },
    });
  },

  // Cria nova igreja
  async create(data) {
    return prisma.igreja.create({ data });
  },

  // Atualiza igreja por ID
  async update(id, data) {
    return prisma.igreja.update({
      where: { id: Number(id) },
      data,
    });
  },
};

module.exports = IgrejaModel;
