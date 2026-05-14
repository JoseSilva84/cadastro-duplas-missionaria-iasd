// Rotas de Duplas Missionárias
const express = require('express');
const { DuplaController, validarDupla } = require('../controllers/dupla.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/duplas — Lista duplas (com filtros)
router.get('/', autenticar, DuplaController.listar);

// GET /api/duplas/:id — Detalhes de uma dupla
router.get('/:id', autenticar, DuplaController.buscarPorId);

// POST /api/duplas — Cadastra nova dupla
router.post('/', autenticar, validarDupla, DuplaController.criar);

// PUT /api/duplas/:id — Atualiza dupla
router.put('/:id', autenticar, DuplaController.atualizar);

// DELETE /api/duplas/:id — Remove dupla (admin/coordenador)
router.delete('/:id', autenticar, autorizar('ADMINISTRADOR', 'COORDENADOR_REGIONAL'), DuplaController.remover);

module.exports = router;
