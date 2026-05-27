// Rotas de Acompanhamento do Coordenador Regional
const express = require('express');
const router = express.Router();
const { AcompanhamentoController, validarAcompanhamento } = require('../controllers/acompanhamento.controller');
const { autenticar } = require('../middlewares/auth');

// Todas as rotas requerem autenticação
router.use(autenticar);

// POST /api/acompanhamentos — Registrar saída
router.post('/', validarAcompanhamento, AcompanhamentoController.criar);

// GET /api/acompanhamentos — Listar saídas (filtros: coordenadorId, de, ate)
router.get('/', AcompanhamentoController.listar);

// GET /api/acompanhamentos/coordenadores — Listar coordenadores regionais
router.get('/coordenadores', AcompanhamentoController.listarCoordenadores);

// GET /api/acompanhamentos/:id — Detalhe de uma saída
router.get('/:id', AcompanhamentoController.buscarPorId);

module.exports = router;
