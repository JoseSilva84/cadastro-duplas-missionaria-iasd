// Controller de Autenticação — Entrada e saída HTTP
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/auth.service');

// Validações do login
const validarLogin = [
  body('email').isEmail().withMessage('E-mail inválido.'),
  body('senha').notEmpty().withMessage('Senha obrigatória.'),
];

const AuthController = {
  // POST /api/auth/login
  async login(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    const { email, senha } = req.body;

    try {
      const resultado = await AuthService.login(email, senha);
      res.json(resultado);
    } catch (err) {
      const status = err.status || 500;
      const mensagem = err.mensagem || 'Erro interno do servidor.';
      res.status(status).json({ erro: mensagem });
    }
  },

  // GET /api/auth/me
  async me(req, res) {
    try {
      const usuario = await AuthService.me(req.usuario.id);
      res.json(usuario);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao buscar dados do usuário.' });
    }
  },
};

module.exports = { AuthController, validarLogin };
