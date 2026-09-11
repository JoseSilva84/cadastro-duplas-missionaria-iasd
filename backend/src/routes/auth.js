// Rotas de Autenticação
const express = require('express');
const {
  AuthController,
  validarLogin,
  validarAtualizacaoConta,
  validarRedefinicaoAcesso,
  validarCriacaoContaDupla,
  validarCadastroDuplaComChave,
} = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');
const { limitarLogin } = require('../middlewares/loginRateLimit');

const router = express.Router();

// POST /api/auth/login — Autenticação de usuário
router.post('/login', limitarLogin, validarLogin, AuthController.login);

// GET /api/auth/validar-chave-cadastro — Valida chave de acesso para auto-cadastro
router.get('/validar-chave-cadastro', AuthController.validarChaveCadastro);

// POST /api/auth/cadastrar-dupla-com-chave — Auto-cadastro de dupla com chave de acesso
router.post('/cadastrar-dupla-com-chave', limitarLogin, validarCadastroDuplaComChave, AuthController.cadastrarDuplaComChave);

// POST /api/auth/redefinir-acesso — troca credenciais usando QR Code temporário
router.post('/redefinir-acesso', limitarLogin, validarRedefinicaoAcesso, AuthController.redefinirAcesso);

// GET /api/auth/validar-token-dupla — valida token de cadastro/QR code de dupla
router.get('/validar-token-dupla', AuthController.validarTokenDupla);

// POST /api/auth/criar-conta-dupla — cria conta da dupla usando QR Code/link
router.post('/criar-conta-dupla', limitarLogin, validarCriacaoContaDupla, AuthController.criarContaDupla);

// GET /api/auth/me — Retorna dados do usuário autenticado
router.get('/me', autenticar, AuthController.me);

// PATCH /api/auth/conta — altera as credenciais do próprio usuário
router.patch('/conta', limitarLogin, autenticar, validarAtualizacaoConta, AuthController.atualizarConta);

module.exports = router;
