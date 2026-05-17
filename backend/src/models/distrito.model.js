// Model de Distrito — Operações no banco de dados
const prisma = require('../lib/prisma');

const DistritoModel = {
  // Lista distritos com filtro opcional
  async findAll(filtro = {}) {
    return prisma.distrito.findMany({
      where: filtro,
      include: {
        regiao: true,
        igrejas: true,
        duplas: { select: {
          id: true,
          liderNome: true,
          membro2Nome: true,
          estudoBiblico: true,
          statusEstudoBiblico: true,
          statusEvangelismo: true,
          batismos: true,
          status: true,
        }},
        _count: { select: { duplas: true } },
      },
      orderBy: { nome: 'asc' },
    });
  },

  // Busca distrito por ID
  async findById(id) {
    return prisma.distrito.findUnique({
      where: { id: Number(id) },
      include: {
        regiao: true,
        igrejas: true,
        _count: { select: { duplas: true } },
        duplas: {
          include: { igreja: true },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });
  },

  // Cria novo distrito
  async create(data) {
    return prisma.distrito.create({ data });
  },

  // Atualiza distrito por ID
  async update(id, data) {
    return prisma.distrito.update({
      where: { id: Number(id) },
      data,
    });
  },
};

module.exports = DistritoModel;
