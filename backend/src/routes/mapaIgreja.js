const express = require('express');
const { MapaIgrejaController, validarMapaIgreja, validarBase } = require('../controllers/mapaIgreja.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

router.get('/', autenticar, MapaIgrejaController.listar);
router.get('/base', autenticar, validarBase, MapaIgrejaController.base);
router.post(
  '/',
  autenticar,
  autorizar(
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.PASTOR_REGIONAL,
    PERFIS.PASTOR_DISTRITAL,
    PERFIS.COORDENADOR_REGIONAL,
    PERFIS.DIRETOR_MISSIONARIO_IGREJA
  ),
  validarMapaIgreja,
  MapaIgrejaController.salvar
);

module.exports = router;
