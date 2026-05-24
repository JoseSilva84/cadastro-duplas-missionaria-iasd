const express = require('express');
const { EscolaSabatinaController, validarCadastroEscolaSabatina } = require('../controllers/escolaSabatina.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

router.get('/', autenticar, EscolaSabatinaController.listar);
router.post(
  '/',
  autenticar,
  autorizar('ADMINISTRADOR', 'LIDER_REGIOES', 'COORDENADOR_REGIONAL', 'PASTOR_DISTRITAL'),
  validarCadastroEscolaSabatina,
  EscolaSabatinaController.criar
);

module.exports = router;
