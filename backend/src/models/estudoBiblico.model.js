const prisma = require('../lib/prisma');

const includeDupla = {
  dupla: {
    select: {
      id: true,
      liderNome: true,
      membro2Nome: true,
      bairro: true,
      distrito: { select: { nome: true, regiao: { select: { nome: true } } } },
    },
  },
};

const EstudoBiblicoModel = {
  findAll(where = {}) {
    return prisma.estudoBiblico.findMany({
      where,
      include: { ...includeDupla, participantes: true },
      orderBy: { criadoEm: 'desc' },
    });
  },

  findById(id) {
    return prisma.estudoBiblico.findUnique({
      where: { id: Number(id) },
      include: { ...includeDupla, participantes: true },
    });
  },

  create(data) {
    return prisma.estudoBiblico.create({
      data,
      include: { ...includeDupla, participantes: true },
    });
  },

  update(id, data) {
    return prisma.estudoBiblico.update({
      where: { id: Number(id) },
      data,
      include: { ...includeDupla, participantes: true },
    });
  },

  remove(id) {
    return prisma.estudoBiblico.delete({ where: { id: Number(id) } });
  },
};

module.exports = EstudoBiblicoModel;
