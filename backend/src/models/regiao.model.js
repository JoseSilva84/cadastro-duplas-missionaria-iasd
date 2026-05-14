// Model de Região — Operações no banco de dados
const prisma = require('../lib/prisma');

const RegiaoModel = {
  // Lista todas as regiões com contagens
  async findAll() {
    const regioes = await prisma.regiao.findMany({
      include: {
        _count: { select: { distritos: true } },
        distritos: {
          include: {
            _count: { select: { duplas: true } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    return regioes.map((r) => ({
      ...r,
      totalDistritos: r._count.distritos,
      totalDuplas: r.distritos.reduce((acc, d) => acc + d._count.duplas, 0),
    }));
  },

  // Busca região por ID
  async findById(id) {
    return prisma.regiao.findUnique({
      where: { id: Number(id) },
      include: {
        distritos: {
          include: {
            igrejas: true,
            _count: { select: { duplas: true } },
          },
        },
      },
    });
  },

  // Cria nova região
  async create(data) {
    return prisma.regiao.create({ data });
  },

  // Atualiza região por ID
  async update(id, data) {
    return prisma.regiao.update({
      where: { id: Number(id) },
      data,
    });
  },

  // Remove região por ID
  async remove(id) {
    return prisma.regiao.delete({ where: { id: Number(id) } });
  },
};

module.exports = RegiaoModel;
