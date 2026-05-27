const express = require('express');
const { EvangelismoController, validarEvangelismo } = require('../controllers/evangelismo.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

router.get('/', autenticar, EvangelismoController.listar);
router.get('/:id', autenticar, EvangelismoController.buscarPorId);
router.post('/', autenticar, validarEvangelismo, EvangelismoController.criar);
router.put('/:id', autenticar, validarEvangelismo, EvangelismoController.atualizar);
router.delete('/:id', autenticar, autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR), EvangelismoController.remover);

module.exports = router;
