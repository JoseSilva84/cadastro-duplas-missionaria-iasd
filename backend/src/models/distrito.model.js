// Model de Distrito — Operações no banco de dados
const prisma = require('../lib/prisma');
const { removerDuplasPorFiltro } = require('./cadastroDelete.model');
const { whereEstudoBatismoConfirmado, anexarBatismosConfirmadosNaDupla } = require('./batismoConfirmado');

const DistritoModel = {
  // Lista distritos com filtro opcional
  async findAll(filtro = {}) {
    const distritos = await prisma.distrito.findMany({
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
          estudosBiblicos: {
            where: whereEstudoBatismoConfirmado,
            include: { participantes: { select: { id: true } } },
          },
        }},
        _count: { select: { duplas: true } },
      },
      orderBy: { nome: 'asc' },
    });

    return distritos.map((distrito) => ({
      ...distrito,
      duplas: distrito.duplas.map(anexarBatismosConfirmadosNaDupla),
    }));
  },

  // Busca distrito por ID
  async findById(id) {
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(id) },
      include: {
        regiao: true,
        igrejas: true,
        _count: { select: { duplas: true } },
        duplas: {
          include: {
            igreja: true,
            estudosBiblicos: {
              where: whereEstudoBatismoConfirmado,
              include: { participantes: { select: { id: true } } },
            },
          },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });
    if (!distrito) return null;
    return {
      ...distrito,
      duplas: distrito.duplas.map(anexarBatismosConfirmadosNaDupla),
    };
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

  async remove(id) {
    const distritoId = Number(id);
    return prisma.$transaction(async (tx) => {
      await removerDuplasPorFiltro(tx, { distritoId });
      const cadastros = await tx.escolaSabatinaCadastro.findMany({
        where: { distritoId },
        select: { id: true },
      });
      const cadastroIds = cadastros.map((cadastro) => cadastro.id);
      await tx.escolaSabatinaDupla.deleteMany({
        where: { escolaSabatinaCadastroId: { in: cadastroIds } },
      });
      await tx.escolaSabatinaCadastro.deleteMany({ where: { distritoId } });
      await tx.usuario.updateMany({
        where: { distritoId },
        data: { distritoId: null },
      });
      await tx.igreja.deleteMany({ where: { distritoId } });
      return tx.distrito.delete({ where: { id: distritoId } });
    });
  },
};

module.exports = DistritoModel;
