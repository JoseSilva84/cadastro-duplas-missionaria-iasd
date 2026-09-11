const express = require('express');
const ConfiguracaoController = require('../controllers/configuracao.controller');
const { autenticar, apenasSuperAdmin, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

router.get('/backup', autenticar, apenasSuperAdmin, ConfiguracaoController.backup);
router.post('/backup/restaurar', autenticar, apenasSuperAdmin, ConfiguracaoController.restaurarBackup);

// Rotas de Gestão de Chaves de Acesso
router.get(
  '/chaves-acesso',
  autenticar,
  autorizar(
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.PASTOR_REGIONAL,
    PERFIS.COORDENADOR_REGIONAL,
    PERFIS.PASTOR_DISTRITAL,
    PERFIS.DIRETOR_MISSIONARIO_IGREJA
  ),
  ConfiguracaoController.listarChavesAcesso
);

router.put(
  '/chaves-acesso',
  autenticar,
  autorizar(
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.PASTOR_REGIONAL,
    PERFIS.COORDENADOR_REGIONAL,
    PERFIS.PASTOR_DISTRITAL
  ),
  ConfiguracaoController.atualizarChaveAcesso
);

module.exports = router;
