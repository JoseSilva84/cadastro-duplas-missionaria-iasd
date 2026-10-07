const express = require('express');
const {
  CalendarioMissionarioController,
  validarConsulta,
  validarSalvar,
} = require('../controllers/calendarioMissionario.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

router.get('/', autenticar, validarConsulta, CalendarioMissionarioController.obter);
router.put(
  '/',
  autenticar,
  autorizar(
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.DIRETOR_MISSIONARIO_IGREJA
  ),
  validarSalvar,
  CalendarioMissionarioController.salvar
);

module.exports = router;
