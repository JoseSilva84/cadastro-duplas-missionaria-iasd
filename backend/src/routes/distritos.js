// Rotas de Distritos
const express = require('express');
const prisma = require('../lib/prisma');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/distritos — Lista distritos (filtrado por região se não for admin)
router.get('/', autenticar, async (req, res) => {
  const { regiaoId } = req.query;
  const { perfil, regiaoId: userRegiaoId, distritoId: userDistritoId } = req.usuario;

  let filtro = {};

  // Filtro por perfil
  if (perfil === 'PASTOR_DISTRITAL') {
    filtro.id = userDistritoId;
  } else if (perfil === 'COORDENADOR_REGIONAL') {
    filtro.regiaoId = userRegiaoId;
  } else if (regiaoId) {
    filtro.regiaoId = Number(regiaoId);
  }

  try {
    const distritos = await prisma.distrito.findMany({
      where: filtro,
      include: {
        regiao: true,
        igrejas: true,
        _count: { select: { duplas: true } },
      },
      orderBy: { nome: 'asc' },
    });
    res.json(distritos);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar distritos.' });
  }
});

// GET /api/distritos/:id — Detalhes de um distrito
router.get('/:id', autenticar, async (req, res) => {
  try {
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        regiao: true,
        igrejas: true,
        duplas: {
          include: { igreja: true },
          orderBy: { criadoEm: 'desc' },
        },
      },
    });
    if (!distrito) return res.status(404).json({ erro: 'Distrito não encontrado.' });
    res.json(distrito);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar distrito.' });
  }
});

// POST /api/distritos — Cria novo distrito
router.post('/', autenticar, autorizar('ADMINISTRADOR', 'COORDENADOR_REGIONAL'), async (req, res) => {
  const { nome, regiaoId } = req.body;
  try {
    const distrito = await prisma.distrito.create({ data: { nome, regiaoId: Number(regiaoId) } });
    res.status(201).json(distrito);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar distrito.' });
  }
});

// PUT /api/distritos/:id — Atualiza distrito
router.put('/:id', autenticar, autorizar('ADMINISTRADOR', 'COORDENADOR_REGIONAL'), async (req, res) => {
  const { nome } = req.body;
  try {
    const distrito = await prisma.distrito.update({
      where: { id: Number(req.params.id) },
      data: { nome },
    });
    res.json(distrito);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar distrito.' });
  }
});

module.exports = router;
