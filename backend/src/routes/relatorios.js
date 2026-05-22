// Rotas de Relatórios
const express = require('express');
const RelatorioController = require('../controllers/relatorio.controller');
const { AcompanhamentoController } = require('../controllers/acompanhamento.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/relatorios/resumo — Resumo geral do sistema
router.get('/resumo', autenticar, RelatorioController.resumo);

// GET /api/relatorios/por-regiao — Duplas agrupadas por região
router.get('/por-regiao', autenticar, autorizar('ADMINISTRADOR', 'LIDER_REGIOES'), RelatorioController.porRegiao);

// GET /api/relatorios/por-distrito/:distritoId
router.get('/por-distrito/:distritoId', autenticar, RelatorioController.porDistrito);

// GET /api/relatorios/estudos-biblicos — Relatório consolidado de estudos bíblicos
router.get('/estudos-biblicos', autenticar, RelatorioController.estudosBiblicos);
router.get('/dashboard-associacao', autenticar, RelatorioController.dashboardAssociacao);
router.patch('/escola-sabatina-resumo', autenticar, autorizar('ADMINISTRADOR', 'LIDER_REGIOES'), RelatorioController.atualizarEscolaSabatinaResumo);

// GET /api/relatorios/acompanhamento — Relatório de saídas do coordenador
router.get('/acompanhamento', autenticar, AcompanhamentoController.relatorio);

module.exports = router;
