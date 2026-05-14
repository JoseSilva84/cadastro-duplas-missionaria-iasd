// Rotas de Regiões
const express = require('express');
const RegiaoController = require('../controllers/regiao.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/regioes — Lista todas as regiões com contagens
router.get('/', autenticar, RegiaoController.listar);

// GET /api/regioes/:id — Detalhes de uma região
router.get('/:id', autenticar, RegiaoController.buscarPorId);

// POST /api/regioes — Cria nova região (admin)
router.post('/', autenticar, autorizar('ADMINISTRADOR'), RegiaoController.criar);

// PUT /api/regioes/:id — Atualiza região (admin)
router.put('/:id', autenticar, autorizar('ADMINISTRADOR'), RegiaoController.atualizar);

// DELETE /api/regioes/:id — Remove região (admin)
router.delete('/:id', autenticar, autorizar('ADMINISTRADOR'), RegiaoController.remover);

module.exports = router;
