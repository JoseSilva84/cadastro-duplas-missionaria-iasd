const prisma = require('../lib/prisma');

const includeAcao = {
  regiao: { select: { nome: true } },
  distrito: { select: { nome: true } },
  igreja: { select: { nome: true } },
  evento: { select: { id: true, nome: true } },
};

const CalendarioMissionarioModel = {
  listarTemas(ano, whereAcoes) {
    return prisma.calendarioTema.findMany({
      where: { ano },
      orderBy: [{ dataInicio: 'asc' }, { id: 'asc' }],
      include: {
        eventos: {
          orderBy: [{ data: 'asc' }, { id: 'asc' }],
          include: {
            acoes: {
              where: whereAcoes,
              orderBy: [{ data: 'asc' }, { id: 'asc' }],
              include: includeAcao,
            },
          },
        },
        acoes: {
          where: whereAcoes,
          orderBy: [{ data: 'asc' }, { id: 'asc' }],
          include: includeAcao,
        },
      },
    });
  },

  buscarTema(id) {
    return prisma.calendarioTema.findUnique({
      where: { id: Number(id) },
      include: {
        eventos: {
          orderBy: [{ data: 'asc' }, { id: 'asc' }],
          include: { acoes: { include: includeAcao } },
        },
        acoes: { include: includeAcao },
      },
    });
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

  // Eventos de um tema (marcos preparatórios como Ações ASA, Feira de Saúde, etc.)
  buscarEvento(id) {
    return prisma.calendarioEvento.findUnique({
      where: { id: Number(id) },
      include: {
        tema: true,
        acoes: { include: includeAcao, orderBy: [{ data: 'asc' }, { id: 'asc' }] },
      },
    });
  },

  criarEvento(data) {
    return prisma.calendarioEvento.create({ data, include: { tema: true } });
  },

  atualizarEvento(id, data) {
    return prisma.calendarioEvento.update({ where: { id: Number(id) }, data, include: { tema: true } });
  },

  excluirEvento(id) {
    return prisma.calendarioEvento.delete({ where: { id: Number(id) } });
  },

  // Ações Missionárias
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

  buscarRegiao(id) {
    return prisma.regiao.findUnique({ where: { id: Number(id) }, select: { id: true, nome: true } });
  },

  listarPermissoes() {
    return prisma.calendarioPermissao.findMany({
      orderBy: [{ regiaoId: 'asc' }, { distritoId: 'asc' }, { perfil: 'asc' }],
      include: {
        regiao: { select: { id: true, nome: true } },
        distrito: { select: { id: true, nome: true } },
      },
    });
  },

  buscarPermissaoPorChave(chave) {
    return prisma.calendarioPermissao.findUnique({ where: { chave } });
  },

  salvarPermissao(chave, data) {
    return prisma.calendarioPermissao.upsert({
      where: { chave },
      create: { chave, ...data },
      update: data,
      include: {
        regiao: { select: { id: true, nome: true } },
        distrito: { select: { id: true, nome: true } },
      },
    });
  },

  excluirPermissao(id) {
    return prisma.calendarioPermissao.delete({ where: { id: Number(id) } });
  },
};

module.exports = CalendarioMissionarioModel;
