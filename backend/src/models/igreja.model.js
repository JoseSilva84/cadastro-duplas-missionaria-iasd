// Model de Igreja — Operações no banco de dados
const prisma = require('../lib/prisma');
const { removerDuplasPorFiltro } = require('./cadastroDelete.model');

const classificarClasseBiblica = (totalEstudantes = 0) => {
  if (totalEstudantes >= 150) return 'A';
  if (totalEstudantes >= 67) return 'B';
  if (totalEstudantes >= 28) return 'C';
  return null;
};

const totalEstudantesDaIgreja = (igreja) => igreja.duplas.reduce((total, dupla) => (
  total + dupla.estudosBiblicos.reduce((acc, estudo) => {
    const participantes = estudo._count?.participantes || 0;
    return acc + (participantes > 0 ? participantes : 1);
  }, 0)
), 0);

const anexarClasseBiblica = (igreja) => {
  const totalEstudantesClasseBiblica = totalEstudantesDaIgreja(igreja);
  return {
    ...igreja,
    classeBiblica: {
      classe: classificarClasseBiblica(totalEstudantesClasseBiblica),
      totalEstudantes: totalEstudantesClasseBiblica,
    },
  };
};

const IgrejaModel = {
  // Lista igrejas com filtro opcional
  async findAll(filtro = {}) {
    const igrejas = await prisma.igreja.findMany({
      where: filtro,
      include: {
        distrito: {
          include: { regiao: true }
        },
        duplas: { select: {
          id: true,
          liderNome: true,
          membro2Nome: true,
          classificacaoDupla: true,
          estudoBiblico: true,
          statusEstudoBiblico: true,
          statusEvangelismo: true,
          batismos: true,
          status: true,
          estudosBiblicos: {
            where: { tipoEstudo: 'CLASSE' },
            select: { id: true, horarioEstudo: true, _count: { select: { participantes: true } } },
          },
        }},
        _count: { select: { duplas: true } },
      },
      orderBy: { nome: 'asc' },
    });

    return igrejas.map(anexarClasseBiblica);
  },

  // Busca igreja por ID
  async findById(id) {
    const igreja = await prisma.igreja.findUnique({
      where: { id: Number(id) },
      include: {
        distrito: {
          include: { regiao: true }
        },
        duplas: {
          include: {
            estudosBiblicos: {
              where: { tipoEstudo: 'CLASSE' },
              select: { id: true, horarioEstudo: true, _count: { select: { participantes: true } } },
            },
          },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });
    if (!igreja) return null;
    return anexarClasseBiblica(igreja);
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

  async remove(id) {
    const igrejaId = Number(id);
    return prisma.$transaction(async (tx) => {
      await removerDuplasPorFiltro(tx, { igrejaId });
      const cadastros = await tx.escolaSabatinaCadastro.findMany({
        where: { igrejaId },
        select: { id: true },
      });
      const cadastroIds = cadastros.map((cadastro) => cadastro.id);
      await tx.escolaSabatinaDupla.deleteMany({
        where: { escolaSabatinaCadastroId: { in: cadastroIds } },
      });
      await tx.escolaSabatinaCadastro.deleteMany({ where: { igrejaId } });
      return tx.igreja.delete({ where: { id: igrejaId } });
    });
  },
};

module.exports = IgrejaModel;
