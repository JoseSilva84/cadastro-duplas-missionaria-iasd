const express = require('express');
const ConfiguracaoController = require('../controllers/configuracao.controller');
const { autenticar, apenasSuperAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/backup', autenticar, apenasSuperAdmin, ConfiguracaoController.backup);
router.post('/backup/restaurar', autenticar, apenasSuperAdmin, ConfiguracaoController.restaurarBackup);

module.exports = router;
