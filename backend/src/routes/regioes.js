// Rotas de Regiões
const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/regioes — Lista todas as regiões com contagens
router.get('/', autenticar, async (req, res) => {
  try {
    const regioes = await prisma.regiao.findMany({
      include: {
        _count: { select: { distritos: true } },
        distritos: {
          include: {
            _count: { select: { duplas: true } },
          },
        },
      },
      orderBy: { nome: 'asc' },
    });

    // Calcula total de duplas por região
    const regioesMapeadas = regioes.map((r) => ({
      ...r,
      totalDistritos: r._count.distritos,
      totalDuplas: r.distritos.reduce((acc, d) => acc + d._count.duplas, 0),
    }));

    res.json(regioesMapeadas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar regiões.' });
  }
});

// GET /api/regioes/:id — Detalhes de uma região
router.get('/:id', autenticar, async (req, res) => {
  try {
    const regiao = await prisma.regiao.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        distritos: {
          include: {
            igrejas: true,
            _count: { select: { duplas: true } },
          },
        },
      },
    });
    if (!regiao) return res.status(404).json({ erro: 'Região não encontrada.' });
    res.json(regiao);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar região.' });
  }
});

// POST /api/regioes — Cria nova região (admin)
router.post('/', autenticar, autorizar('ADMINISTRADOR'), async (req, res) => {
  const { nome, descricao, cor } = req.body;
  try {
    const regiao = await prisma.regiao.create({ data: { nome, descricao, cor } });
    res.status(201).json(regiao);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar região.' });
  }
});

// PUT /api/regioes/:id — Atualiza região (admin)
router.put('/:id', autenticar, autorizar('ADMINISTRADOR'), async (req, res) => {
  const { nome, descricao, cor } = req.body;
  try {
    const regiao = await prisma.regiao.update({
      where: { id: Number(req.params.id) },
      data: { nome, descricao, cor },
    });
    res.json(regiao);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar região.' });
  }
});

// DELETE /api/regioes/:id — Remove região (admin)
router.delete('/:id', autenticar, autorizar('ADMINISTRADOR'), async (req, res) => {
  try {
    await prisma.regiao.delete({ where: { id: Number(req.params.id) } });
    res.json({ mensagem: 'Região removida com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover região.' });
  }
});

module.exports = router;
