const prisma = require('../lib/prisma');

const includeDupla = {
  dupla: {
    select: {
      id: true,
      liderNome: true,
      membro2Nome: true,
      bairro: true,
      igreja: { select: { id: true, nome: true } },
      distrito: { select: { id: true, nome: true, regiao: { select: { nome: true } } } },
    },
  },
};

const EvangelismoModel = {
  findAll(where = {}) {
    return prisma.evangelismo.findMany({
      where,
      include: includeDupla,
      orderBy: { criadoEm: 'desc' },
    });
  },

  findById(id) {
    return prisma.evangelismo.findUnique({
      where: { id: Number(id) },
      include: includeDupla,
    });
  },

  create(data) {
    return prisma.evangelismo.create({
      data,
      include: includeDupla,
    });
  },

  update(id, data) {
    return prisma.evangelismo.update({
      where: { id: Number(id) },
      data,
      include: includeDupla,
    });
  },

  remove(id) {
    return prisma.evangelismo.delete({ where: { id: Number(id) } });
  },
};

module.exports = EvangelismoModel;
