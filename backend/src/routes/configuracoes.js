const express = require('express');
const ConfiguracaoController = require('../controllers/configuracao.controller');
const { autenticar, apenasSuperAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/backup', autenticar, apenasSuperAdmin, ConfiguracaoController.backup);

module.exports = router;
