// Rotas de Autenticação
const express = require('express');
const { AuthController, validarLogin } = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/auth');

const router = express.Router();

// POST /api/auth/login — Autenticação de usuário
router.post('/login', validarLogin, AuthController.login);

// GET /api/auth/me — Retorna dados do usuário autenticado
router.get('/me', autenticar, AuthController.me);

module.exports = router;
