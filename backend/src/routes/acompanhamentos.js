// Rotas de Acompanhamento do Coordenador Regional
const express = require('express');
const router = express.Router();
const { AcompanhamentoController, validarAcompanhamento } = require('../controllers/acompanhamento.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const PERFIS_LEITURA = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.COORDENADOR_REGIONAL];
const PERFIS_CADASTRO = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.COORDENADOR_REGIONAL];

// Todas as rotas requerem autenticação
router.use(autenticar);

// POST /api/acompanhamentos — Registrar saída
router.post('/', autorizar(...PERFIS_CADASTRO), validarAcompanhamento, AcompanhamentoController.criar);

// GET /api/acompanhamentos — Listar saídas (filtros: coordenadorId, de, ate)
router.get('/', autorizar(...PERFIS_LEITURA), AcompanhamentoController.listar);

// GET /api/acompanhamentos/coordenadores — Listar coordenadores regionais
router.get('/coordenadores', autorizar(...PERFIS_LEITURA), AcompanhamentoController.listarCoordenadores);

// GET /api/acompanhamentos/:id — Detalhe de uma saída
router.get('/:id', autorizar(...PERFIS_LEITURA), AcompanhamentoController.buscarPorId);

module.exports = router;
