// Rotas de Usuários — com controle de acesso RBAC
const express = require('express');
const UsuarioController = require('../controllers/usuario.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

// GET /api/usuarios — Admin vê todos; Pastor Regional vê os da sua região
router.get(
  '/',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL),
  UsuarioController.listar
);

// POST /api/usuarios — Admin cria qualquer perfil; Pastor Regional cria PD/Coord da sua região
router.post(
  '/',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL),
  UsuarioController.criar
);

// PUT /api/usuarios/:id — Admin e Pastor Regional (restrição no service)
router.put(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL),
  UsuarioController.atualizar
);

// DELETE /api/usuarios/:id — Apenas admins desativam usuários
router.delete(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR),
  UsuarioController.desativar
);

// PATCH /api/usuarios/:id/senha - Apenas admins redefinem senhas
router.patch(
  '/:id/senha',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR),
  UsuarioController.redefinirSenha
);

module.exports = router;
