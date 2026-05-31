// Rotas de Relatórios
const express = require('express');
const RelatorioController = require('../controllers/relatorio.controller');
const { AcompanhamentoController } = require('../controllers/acompanhamento.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

// GET /api/relatorios/resumo — Resumo geral do sistema
router.get('/resumo', autenticar, RelatorioController.resumo);

// GET /api/relatorios/por-regiao — Duplas agrupadas por região
router.get('/por-regiao', autenticar, autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL), RelatorioController.porRegiao);

// GET /api/relatorios/por-distrito/:distritoId
router.get('/por-distrito/:distritoId', autenticar, RelatorioController.porDistrito);
router.get('/por-igreja/:igrejaId', autenticar, RelatorioController.porIgreja);

// GET /api/relatorios/estudos-biblicos — Relatório consolidado de estudos bíblicos
router.get('/estudos-biblicos', autenticar, RelatorioController.estudosBiblicos);
router.get('/dashboard-associacao', autenticar, RelatorioController.dashboardAssociacao);
router.get('/coordenadores-regionais', autenticar, RelatorioController.coordenadoresRegionais);
router.get('/personalizado', autenticar, autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR), RelatorioController.personalizado);
router.patch('/escola-sabatina-resumo', autenticar, autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR), RelatorioController.atualizarEscolaSabatinaResumo);

// GET /api/relatorios/acompanhamento — Relatório de saídas do coordenador
router.get('/acompanhamento', autenticar, AcompanhamentoController.relatorio);

module.exports = router;
