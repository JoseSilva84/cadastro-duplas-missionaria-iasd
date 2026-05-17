// Rotas de Igrejas
const express = require('express');
const IgrejaController = require('../controllers/igreja.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/igrejas — Lista igrejas (filtrado por distrito/regiao se não for admin)
router.get('/', autenticar, IgrejaController.listar);

// GET /api/igrejas/:id — Detalhes de uma igreja
router.get('/:id', autenticar, IgrejaController.buscarPorId);

// POST /api/igrejas — Cria nova igreja
router.post('/', autenticar, autorizar('ADMINISTRADOR', 'COORDENADOR_REGIONAL'), IgrejaController.criar);

// PUT /api/igrejas/:id — Atualiza igreja
router.put('/:id', autenticar, autorizar('ADMINISTRADOR', 'COORDENADOR_REGIONAL'), IgrejaController.atualizar);

module.exports = router;
