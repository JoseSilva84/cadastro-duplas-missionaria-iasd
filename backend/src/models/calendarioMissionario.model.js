const prisma = require('../lib/prisma');

const includeAcao = {
  regiao: { select: { nome: true } },
  distrito: { select: { nome: true } },
  igreja: { select: { nome: true } },
};

const CalendarioMissionarioModel = {
  listarTemas(ano, whereAcoes) {
    return prisma.calendarioTema.findMany({
      where: { ano },
      orderBy: [{ dataInicio: 'asc' }, { id: 'asc' }],
      include: {
        acoes: {
          where: whereAcoes,
          orderBy: [{ data: 'asc' }, { id: 'asc' }],
          include: includeAcao,
        },
      },
    });
  },

  buscarTema(id) {
    return prisma.calendarioTema.findUnique({ where: { id: Number(id) } });
  },

  contarTemas(ano) {
    return prisma.calendarioTema.count({ where: { ano } });
  },

  criarTema(data) {
    return prisma.calendarioTema.create({ data });
  },

  atualizarTema(id, data) {
    return prisma.calendarioTema.update({ where: { id: Number(id) }, data });
  },

  excluirTema(id) {
    return prisma.calendarioTema.delete({ where: { id: Number(id) } });
  },

  // Modelo inicial: temas com acoes da Associacao (sem origem regional/local).
  criarTemasComAcoes(temas) {
    return prisma.$transaction(temas.map((tema) => prisma.calendarioTema.create({
      data: { ...tema.dados, acoes: { create: tema.acoes } },
    })));
  },

  buscarAcao(id) {
    return prisma.calendarioAcaoMissionaria.findUnique({ where: { id: Number(id) }, include: includeAcao });
  },

  criarAcao(data) {
    return prisma.calendarioAcaoMissionaria.create({ data, include: includeAcao });
  },

  atualizarAcao(id, data) {
    return prisma.calendarioAcaoMissionaria.update({ where: { id: Number(id) }, data, include: includeAcao });
  },

  excluirAcao(id) {
    return prisma.calendarioAcaoMissionaria.delete({ where: { id: Number(id) } });
  },

  buscarIgreja(id) {
    return prisma.igreja.findUnique({
      where: { id: Number(id) },
      select: { id: true, distritoId: true, distrito: { select: { regiaoId: true } } },
    });
  },

  buscarDistrito(id) {
    return prisma.distrito.findUnique({ where: { id: Number(id) }, select: { id: true, regiaoId: true } });
  },
};

module.exports = CalendarioMissionarioModel;
