// Rotas de Distritos
const express = require('express');
const DistritoController = require('../controllers/distrito.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/distritos — Lista distritos (filtrado por região se não for admin)
router.get('/', autenticar, DistritoController.listar);

// GET /api/distritos/:id — Detalhes de um distrito
router.get('/:id', autenticar, DistritoController.buscarPorId);

// POST /api/distritos — Cria novo distrito
router.post('/', autenticar, autorizar('ADMINISTRADOR', 'COORDENADOR_REGIONAL'), DistritoController.criar);

// PUT /api/distritos/:id — Atualiza distrito
router.put('/:id', autenticar, autorizar('ADMINISTRADOR', 'COORDENADOR_REGIONAL'), DistritoController.atualizar);

module.exports = router;
