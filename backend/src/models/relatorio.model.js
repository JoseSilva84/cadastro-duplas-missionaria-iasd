// Model de Relatório — Operações no banco de dados
const prisma = require('../lib/prisma');

const RelatorioModel = {
  // Resumo geral do sistema
  async resumo() {
    const [totalDuplas, totalAtivas, totalPendentes, totalInativas, totalPessoas] = await Promise.all([
      prisma.dupla.count(),
      prisma.dupla.count({ where: { status: 'ATIVA' } }),
      prisma.dupla.count({ where: { status: 'PENDENTE' } }),
      prisma.dupla.count({ where: { status: 'INATIVA' } }),
      prisma.dupla.aggregate({ _sum: { pessoasAlcancadas: true } }),
    ]);

    const porProjeto = await prisma.dupla.groupBy({
      by: ['tipoProjeto'],
      _count: { tipoProjeto: true },
    });

    return {
      totalDuplas,
      totalAtivas,
      totalPendentes,
      totalInativas,
      totalPessoasAlcancadas: totalPessoas._sum.pessoasAlcancadas || 0,
      porProjeto,
    };
  },

  // Duplas agrupadas por região
  async porRegiao() {
    const regioes = await prisma.regiao.findMany({
      include: {
        distritos: {
          include: {
            duplas: true,
            _count: { select: { duplas: true } },
          },
        },
      },
    });

    return regioes.map((r) => ({
      id: r.id,
      nome: r.nome,
      cor: r.cor,
      totalDistritos: r.distritos.length,
      totalDuplas: r.distritos.reduce((acc, d) => acc + d._count.duplas, 0),
      totalPessoas: r.distritos.reduce((acc, d) =>
        acc + d.duplas.reduce((a, dupla) => a + dupla.pessoasAlcancadas, 0), 0),
    }));
  },

  // Relatório de um distrito específico
  async porDistrito(distritoId) {
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(distritoId) },
      include: {
        regiao: true,
        duplas: true,
        igrejas: true,
      },
    });

    if (!distrito) return null;

    return {
      distrito: distrito.nome,
      regiao: distrito.regiao.nome,
      totalIgrejas: distrito.igrejas.length,
      totalDuplas: distrito.duplas.length,
      ativas: distrito.duplas.filter((d) => d.status === 'ATIVA').length,
      pendentes: distrito.duplas.filter((d) => d.status === 'PENDENTE').length,
      inativas: distrito.duplas.filter((d) => d.status === 'INATIVA').length,
      pessoasAlcancadas: distrito.duplas.reduce((acc, d) => acc + d.pessoasAlcancadas, 0),
    };
  },
};

module.exports = RelatorioModel;
