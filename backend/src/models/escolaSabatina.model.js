const prisma = require('../lib/prisma');

const includeCadastro = {
  distrito: { select: { id: true, nome: true } },
  igreja: { select: { id: true, nome: true } },
  criadoPor: { select: { id: true, nome: true, perfil: true } },
  duplas: {
    include: {
      dupla: {
        select: {
          id: true,
          liderNome: true,
          membro2Nome: true,
          bairro: true,
          tipoProjeto: true,
          status: true,
        },
      },
    },
  },
};

const EscolaSabatinaModel = {
  async listar(where = {}) {
    return prisma.escolaSabatinaCadastro.findMany({
      where,
      include: includeCadastro,
      orderBy: { criadoEm: 'desc' },
    });
  },

  async criar(data, duplaIds = []) {
    return prisma.escolaSabatinaCadastro.create({
      data: {
        ...data,
        duplas: {
          create: duplaIds.map((duplaId) => ({ duplaId })),
        },
      },
      include: includeCadastro,
    });
  },

  async buscarIgreja(id) {
    return prisma.igreja.findUnique({
      where: { id: Number(id) },
      select: { id: true, distritoId: true },
    });
  },

  async buscarDuplas(ids) {
    return prisma.dupla.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        distritoId: true,
        igrejaId: true,
        tipoProjeto: true,
      },
    });
  },
};

module.exports = EscolaSabatinaModel;
