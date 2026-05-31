const express = require('express');
const { EscolaSabatinaController, validarCadastroEscolaSabatina } = require('../controllers/escolaSabatina.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

router.get('/', autenticar, EscolaSabatinaController.listar);
router.post(
  '/',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.COORDENADOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA),
  validarCadastroEscolaSabatina,
  EscolaSabatinaController.criar
);
router.delete(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR),
  EscolaSabatinaController.remover
);

module.exports = router;
