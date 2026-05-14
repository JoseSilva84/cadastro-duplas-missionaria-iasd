// Rotas de Relatórios
const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/relatorios/resumo — Resumo geral do sistema
router.get('/resumo', autenticar, async (req, res) => {
  try {
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

    res.json({
      totalDuplas,
      totalAtivas,
      totalPendentes,
      totalInativas,
      totalPessoasAlcancadas: totalPessoas._sum.pessoasAlcancadas || 0,
      porProjeto,
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar relatório.' });
  }
});

// GET /api/relatorios/por-regiao — Duplas agrupadas por região
router.get('/por-regiao', autenticar, autorizar('ADMINISTRADOR', 'LIDER_REGIOES'), async (req, res) => {
  try {
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

    const resultado = regioes.map((r) => ({
      id: r.id,
      nome: r.nome,
      cor: r.cor,
      totalDistritos: r.distritos.length,
      totalDuplas: r.distritos.reduce((acc, d) => acc + d._count.duplas, 0),
      totalPessoas: r.distritos.reduce((acc, d) =>
        acc + d.duplas.reduce((a, dupla) => a + dupla.pessoasAlcancadas, 0), 0),
    }));

    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar relatório por região.' });
  }
});

// GET /api/relatorios/por-distrito/:distritoId
router.get('/por-distrito/:distritoId', autenticar, async (req, res) => {
  try {
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(req.params.distritoId) },
      include: {
        regiao: true,
        duplas: true,
        igrejas: true,
      },
    });
    if (!distrito) return res.status(404).json({ erro: 'Distrito não encontrado.' });

    res.json({
      distrito: distrito.nome,
      regiao: distrito.regiao.nome,
      totalIgrejas: distrito.igrejas.length,
      totalDuplas: distrito.duplas.length,
      ativas: distrito.duplas.filter((d) => d.status === 'ATIVA').length,
      pendentes: distrito.duplas.filter((d) => d.status === 'PENDENTE').length,
      inativas: distrito.duplas.filter((d) => d.status === 'INATIVA').length,
      pessoasAlcancadas: distrito.duplas.reduce((acc, d) => acc + d.pessoasAlcancadas, 0),
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar relatório do distrito.' });
  }
});

module.exports = router;
