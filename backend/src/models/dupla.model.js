// Model de Dupla — Operações no banco de dados
const prisma = require('../lib/prisma');
const { removerDuplasPorIds } = require('./cadastroDelete.model');

const whereEstudoEmAndamento = {
  encerrado: false,
  statusEstudo: 'EM_ANDAMENTO',
};

const contagensDaDupla = {
  estudosBiblicos: { where: whereEstudoEmAndamento },
  acompanhamentos: true,
};

const DuplaModel = {
  // Lista duplas com filtro opcional
  async findAll(filtro = {}, opcoes = {}) {
    const consulta = {
      where: filtro,
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        estudosBiblicos: {
          include: { participantes: true },
          orderBy: { atualizadoEm: 'desc' },
        },
        _count: { select: contagensDaDupla },
      },
      orderBy: [
        { liderNome: 'asc' },
        { membro2Nome: 'asc' },
        { criadoEm: 'desc' },
      ],
    };

    if (!opcoes.paginado) return prisma.dupla.findMany(consulta);

    const pagina = Math.max(1, Number(opcoes.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(opcoes.limite) || 100));
    const [itens, total, resumo] = await Promise.all([
      prisma.dupla.findMany({
        ...consulta,
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      prisma.dupla.count({ where: filtro }),
      pagina === 1 ? DuplaModel.resumir(filtro) : Promise.resolve(null),
    ]);

    return {
      itens,
      total,
      pagina,
      limite,
      paginas: Math.ceil(total / limite),
      temMais: pagina * limite < total,
      resumo,
    };
  },

  async resumir(filtro = {}) {
    const filtroDaDupla = { is: filtro };
    const [totalDuplas, estudosEmAndamento, classesAtivas, estudosComBatismo] = await Promise.all([
      prisma.dupla.count({ where: filtro }),
      prisma.estudoBiblico.count({
        where: {
          ...whereEstudoEmAndamento,
          dupla: filtroDaDupla,
        },
      }),
      prisma.dupla.count({
        where: { AND: [filtro, { statusEvangelismo: 'ATIVO' }] },
      }),
      prisma.estudoBiblico.findMany({
        where: {
          motivoEncerramento: 'BATISMO',
          dupla: filtroDaDupla,
        },
        select: {
          tipoEstudo: true,
          _count: { select: { participantes: true } },
        },
      }),
    ]);

    const batismos = estudosComBatismo.reduce((total, estudo) => {
      const participantes = estudo._count?.participantes || 0;
      return total + (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) && participantes > 0 ? participantes : 1);
    }, 0);

    return { totalDuplas, estudosEmAndamento, classesAtivas, batismos };
  },

  // Busca dupla por ID
  async findById(id) {
    return prisma.dupla.findUnique({
      where: { id: Number(id) },
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        estudosBiblicos: {
          include: { participantes: true },
          orderBy: { atualizadoEm: 'desc' },
        },
        _count: { select: contagensDaDupla },
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
        _count: { select: contagensDaDupla },
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
        _count: { select: contagensDaDupla },
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
