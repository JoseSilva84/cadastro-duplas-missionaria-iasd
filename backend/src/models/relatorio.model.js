// Model de Relatório — Operações no banco de dados
const prisma = require('../lib/prisma');

const RelatorioModel = {
  async resumo() {
    const [totalDuplas, totalAtivas, totalPendentes, totalInativas, totalPessoas] = await Promise.all([
      prisma.dupla.count(),
      prisma.dupla.count({ where: { status: 'ATIVA' } }),
      prisma.dupla.count({ where: { status: 'PENDENTE' } }),
      prisma.dupla.count({ where: { status: 'INATIVA' } }),
      prisma.dupla.aggregate({ _sum: { pessoasAlcancadas: true, batismos: true } }),
    ]);

    const [estudosAtivos, evangelismosAtivos] = await Promise.all([
      prisma.dupla.count({ where: { statusEstudoBiblico: 'ATIVO' } }),
      prisma.dupla.count({ where: { statusEvangelismo: 'ATIVO' } }),
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
      totalBatismos: totalPessoas._sum.batismos || 0,
      estudosAtivos,
      evangelismosAtivos,
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

    return regioes.map((r) => {
      const todasDuplas = r.distritos.flatMap(d => d.duplas);

      return {
        id: r.id,
        nome: r.nome,
        cor: r.cor,
        totalDistritos: r.distritos.length,
        totalDuplas: todasDuplas.length,
        ativas: todasDuplas.filter(d => d.status === 'ATIVA').length,
        pendentes: todasDuplas.filter(d => d.status === 'PENDENTE').length,
        inativas: todasDuplas.filter(d => d.status === 'INATIVA').length,
        estudosAtivos: todasDuplas.filter(d => d.statusEstudoBiblico === 'ATIVO').length,
        evangelismosAtivos: todasDuplas.filter(d => d.statusEvangelismo === 'ATIVO').length,
        totalBatismos: todasDuplas.reduce((a, d) => a + (d.batismos || 0), 0),
        totalPessoas: todasDuplas.reduce((a, d) => a + (d.pessoasAlcancadas || 0), 0),
        distritos: r.distritos.map(d => ({
          id: d.id,
          nome: d.nome,
          totalDuplas: d._count.duplas,
          totalPessoas: d.duplas.reduce((a, dupla) => a + (dupla.pessoasAlcancadas || 0), 0)
        })).sort((a, b) => b.totalDuplas - a.totalDuplas)
      };
    });
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
