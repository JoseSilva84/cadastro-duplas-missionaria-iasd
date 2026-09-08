const express = require('express');
const InteressadosNovoTempoController = require('../controllers/interessadosNovoTempo.controller');
const { autenticar, apenasAdmins } = require('../middlewares/auth');

const router = express.Router();

router.use(autenticar, apenasAdmins);
router.get('/status', InteressadosNovoTempoController.status);
router.get('/resumo', InteressadosNovoTempoController.resumo);
router.get('/analise', InteressadosNovoTempoController.analise);
router.get('/analise/distritos/:distrito', InteressadosNovoTempoController.analisePorDistrito);
router.get('/distritos/:distrito', InteressadosNovoTempoController.porDistrito);

module.exports = router;
