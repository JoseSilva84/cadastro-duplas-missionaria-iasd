const express = require('express');
const InteressadosNovoTempoController = require('../controllers/interessadosNovoTempo.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

router.use(
  autenticar,
  autorizar(
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.PASTOR_REGIONAL,
    PERFIS.COORDENADOR_REGIONAL,
    PERFIS.PASTOR_DISTRITAL,
    PERFIS.DIRETOR_MISSIONARIO_IGREJA,
    PERFIS.DUPLA_MISSIONARIA
  )
);
router.get('/status', InteressadosNovoTempoController.status);
router.get('/campanhas', InteressadosNovoTempoController.campanhas);
router.get('/campanhas/:campanhaId/resumo', InteressadosNovoTempoController.resumoCampanha);
router.get('/campanhas/:campanhaId/conversas', InteressadosNovoTempoController.conversasCampanha);
router.get('/campanhas/:campanhaId/conversas/:conversaId', InteressadosNovoTempoController.detalheConversaCampanha);
router.get('/resumo', InteressadosNovoTempoController.resumo);
router.get('/filtragem-avancada', InteressadosNovoTempoController.filtragemAvancada);
router.get('/analise', InteressadosNovoTempoController.analise);
router.get('/analise/distritos/:distrito', InteressadosNovoTempoController.analisePorDistrito);
router.get('/distritos/:distrito', InteressadosNovoTempoController.porDistrito);

module.exports = router;
