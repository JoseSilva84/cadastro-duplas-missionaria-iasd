// Model de Região — Operações no banco de dados
const prisma = require('../lib/prisma');
const { removerDuplasPorFiltro } = require('./cadastroDelete.model');

const REGIOES_OFICIAIS = Array.from({ length: 7 }, (_, index) => `REGIÃO ${index + 1}`);

const ordemRegiaoOficial = (nome = '') => {
  const resultado = String(nome).match(/^REGIÃO\s+(\d+)$/i);
  return resultado ? Number(resultado[1]) : 999;
};

const RegiaoModel = {
  // Lista todas as regiões com contagens
  async findAll() {
    const regioes = await prisma.regiao.findMany({
      where: { nome: { in: REGIOES_OFICIAIS } },
      include: {
        _count: { select: { distritos: true } },
        distritos: {
          include: {
            _count: { select: { duplas: true, igrejas: true } },
          },
        },
      },
    });

    return regioes
      .map((r) => ({
        ...r,
        totalDistritos: r._count.distritos,
        totalDuplas: r.distritos.reduce((acc, d) => acc + d._count.duplas, 0),
        totalIgrejas: r.distritos.reduce((acc, d) => acc + d._count.igrejas, 0),
        totalMembros: r.distritos.reduce((acc, d) => acc + (d.membros || 0), 0),
      }))
      .sort((a, b) => ordemRegiaoOficial(a.nome) - ordemRegiaoOficial(b.nome));
  },

  // Busca região por ID
  async findById(id) {
    return prisma.regiao.findFirst({
      where: {
        id: Number(id),
        nome: { in: REGIOES_OFICIAIS },
      },
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
    const regiaoId = Number(id);
    return prisma.$transaction(async (tx) => {
      const distritos = await tx.distrito.findMany({
        where: { regiaoId },
        select: { id: true },
      });
      const distritoIds = distritos.map((distrito) => distrito.id);

      await removerDuplasPorFiltro(tx, { distritoId: { in: distritoIds } });
      const cadastros = await tx.escolaSabatinaCadastro.findMany({
        where: { distritoId: { in: distritoIds } },
        select: { id: true },
      });
      const cadastroIds = cadastros.map((cadastro) => cadastro.id);
      await tx.escolaSabatinaDupla.deleteMany({
        where: { escolaSabatinaCadastroId: { in: cadastroIds } },
      });
      await tx.escolaSabatinaCadastro.deleteMany({
        where: { distritoId: { in: distritoIds } },
      });
      await tx.usuario.updateMany({
        where: { distritoId: { in: distritoIds } },
        data: { distritoId: null },
      });
      await tx.usuario.updateMany({
        where: { regiaoId },
        data: { regiaoId: null },
      });
      await tx.igreja.deleteMany({ where: { distritoId: { in: distritoIds } } });
      await tx.distrito.deleteMany({ where: { regiaoId } });
      return tx.regiao.delete({ where: { id: regiaoId } });
    });
  },
};

module.exports = RegiaoModel;
