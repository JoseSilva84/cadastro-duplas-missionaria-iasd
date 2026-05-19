const express = require('express');
const { EstudoBiblicoController, validarEstudoBiblico } = require('../controllers/estudoBiblico.controller');
const { autenticar } = require('../middlewares/auth');

const router = express.Router();

router.get('/', autenticar, EstudoBiblicoController.listar);
router.get('/:id', autenticar, EstudoBiblicoController.buscarPorId);
router.post('/', autenticar, validarEstudoBiblico, EstudoBiblicoController.criar);
router.put('/:id', autenticar, validarEstudoBiblico, EstudoBiblicoController.atualizar);
router.delete('/:id', autenticar, EstudoBiblicoController.remover);

module.exports = router;
