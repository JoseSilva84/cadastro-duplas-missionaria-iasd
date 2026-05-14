// Rotas de Usuários
const express = require('express');
const UsuarioController = require('../controllers/usuario.controller');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/usuarios — Lista usuários (admin)
router.get('/', autenticar, autorizar('ADMINISTRADOR'), UsuarioController.listar);

// POST /api/usuarios — Cria novo usuário (admin)
router.post('/', autenticar, autorizar('ADMINISTRADOR'), UsuarioController.criar);

// PUT /api/usuarios/:id — Atualiza usuário (admin)
router.put('/:id', autenticar, autorizar('ADMINISTRADOR'), UsuarioController.atualizar);

// DELETE /api/usuarios/:id — Desativa usuário (admin)
router.delete('/:id', autenticar, autorizar('ADMINISTRADOR'), UsuarioController.desativar);

module.exports = router;
