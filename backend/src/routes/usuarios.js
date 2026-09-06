// Rotas de Usuários — com controle de acesso RBAC
const express = require('express');
const UsuarioController = require('../controllers/usuario.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

// GET /api/usuarios — Admin vê todos; gestores regionais veem a própria região.
router.get(
  '/',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL),
  UsuarioController.listar
);

// POST /api/usuarios — Admin cria qualquer perfil; gestores regionais atuam na própria região.
router.post(
  '/',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL),
  UsuarioController.criar
);

// PUT /api/usuarios/:id — Restrições de perfil e região são aplicadas no service.
router.put(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL),
  UsuarioController.atualizar
);

// DELETE /api/usuarios/:id — Gestores regionais só podem atuar na própria região.
router.delete(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL),
  UsuarioController.desativar
);

// PATCH /api/usuarios/:id/senha - Redefinição por gestores autorizados.
router.patch(
  '/:id/senha',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL),
  UsuarioController.redefinirSenha
);

// POST /api/usuarios/:id/redefinicao-qrcode - Link temporário para troca de acesso
router.post(
  '/:id/redefinicao-qrcode',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL),
  UsuarioController.gerarRedefinicaoQrCode
);

module.exports = router;
