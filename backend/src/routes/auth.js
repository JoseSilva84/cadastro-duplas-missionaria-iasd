// Rotas de Autenticação
const express = require('express');
const {
  AuthController,
  validarLogin,
  validarAtualizacaoConta,
  validarRedefinicaoAcesso,
} = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');
const { limitarLogin } = require('../middlewares/loginRateLimit');

const router = express.Router();

// POST /api/auth/login — Autenticação de usuário
router.post('/login', limitarLogin, validarLogin, AuthController.login);

// POST /api/auth/redefinir-acesso — troca credenciais usando QR Code temporário
router.post('/redefinir-acesso', limitarLogin, validarRedefinicaoAcesso, AuthController.redefinirAcesso);

// GET /api/auth/me — Retorna dados do usuário autenticado
router.get('/me', autenticar, AuthController.me);

// PATCH /api/auth/conta — altera as credenciais do próprio usuário
router.patch('/conta', limitarLogin, autenticar, validarAtualizacaoConta, AuthController.atualizarConta);

module.exports = router;
