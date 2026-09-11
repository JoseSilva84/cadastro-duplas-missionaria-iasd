// Controller de Autenticação — Entrada e saída HTTP
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/auth.service');

// Validações do login
const validarLogin = [
  body('email').isEmail().withMessage('E-mail inválido.'),
  body('senha').notEmpty().withMessage('Senha obrigatória.'),
];

const validarAtualizacaoConta = [
  body('email').trim().isEmail().withMessage('E-mail inválido.'),
  body('senhaAtual').notEmpty().withMessage('Informe a senha atual.'),
  body('novaSenha').optional({ checkFalsy: true }).custom((valor) => String(valor).trim().length >= 8)
    .withMessage('A nova senha deve ter pelo menos 8 caracteres.'),
];

const validarRedefinicaoAcesso = [
  body('token').notEmpty().withMessage('Token de redefinição obrigatório.'),
  body('email').trim().isEmail().withMessage('E-mail inválido.'),
  body('novaSenha').custom((valor) => String(valor || '').trim().length >= 8)
    .withMessage('A nova senha deve ter pelo menos 8 caracteres.'),
];

const validarCriacaoContaDupla = [
  body('token').notEmpty().withMessage('Token de convite obrigatório.'),
  body('email').trim().isEmail().withMessage('E-mail inválido.'),
  body('senha').custom((valor) => String(valor || '').trim().length >= 8)
    .withMessage('A senha deve ter pelo menos 8 caracteres.'),
];

const responderErrosValidacao = (req, res) => {
  const erros = validationResult(req);
  if (erros.isEmpty()) return false;
  res.status(400).json({ erro: erros.array()[0].msg, erros: erros.array() });
  return true;
};

const AuthController = {
  // POST /api/auth/login
  async login(req, res) {
    if (responderErrosValidacao(req, res)) return;

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

  // PATCH /api/auth/conta
  async atualizarConta(req, res) {
    if (responderErrosValidacao(req, res)) return;
    try {
      const resultado = await AuthService.atualizarConta(req.usuario.id, req.body);
      res.json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao atualizar a conta.' });
    }
  },

  // POST /api/auth/redefinir-acesso
  async redefinirAcesso(req, res) {
    if (responderErrosValidacao(req, res)) return;
    try {
      const resultado = await AuthService.redefinirAcessoComToken(req.body);
      res.json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao redefinir o acesso.' });
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

  // GET /api/auth/validar-token-dupla
  async validarTokenDupla(req, res) {
    try {
      const token = req.query.token;
      const resultado = await AuthService.validarTokenCadastroDupla(token);
      res.json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao validar link ou QR Code.' });
    }
  },

  // POST /api/auth/criar-conta-dupla
  async criarContaDupla(req, res) {
    if (responderErrosValidacao(req, res)) return;
    try {
      const resultado = await AuthService.criarContaDuplaComToken(req.body);
      res.json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao criar conta da dupla.' });
    }
  },

  // GET /api/auth/validar-chave-cadastro
  async validarChaveCadastro(req, res) {
    try {
      const { chave } = req.query;
      const resultado = await AuthService.validarChaveCadastro(chave);
      res.json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao validar chave de acesso.' });
    }
  },

  // POST /api/auth/cadastrar-dupla-com-chave
  async cadastrarDuplaComChave(req, res) {
    if (responderErrosValidacao(req, res)) return;
    try {
      const resultado = await AuthService.cadastrarDuplaComChave(req.body);
      res.status(201).json(resultado);
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao cadastrar dupla missionária.' });
    }
  },
};

const validarCadastroDuplaComChave = [
  body('chave').notEmpty().withMessage('Chave de acesso obrigatória.'),
  body('liderNome').notEmpty().withMessage('Nome do Membro 1 (Líder) obrigatório.'),
  body('membro2Nome').notEmpty().withMessage('Nome do Membro 2 (Parceiro) obrigatório.'),
  body('email').trim().isEmail().withMessage('E-mail de acesso inválido.'),
  body('senha').custom((valor) => String(valor || '').trim().length >= 8)
    .withMessage('A senha deve ter pelo menos 8 caracteres.'),
  body('igrejaId').notEmpty().withMessage('Selecione a igreja da dupla.'),
];

module.exports = {
  AuthController,
  validarLogin,
  validarAtualizacaoConta,
  validarRedefinicaoAcesso,
  validarCriacaoContaDupla,
  validarCadastroDuplaComChave,
};
