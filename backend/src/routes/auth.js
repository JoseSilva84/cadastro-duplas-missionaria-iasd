// Rotas de autenticação
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { autenticar } = require('../middlewares/auth');

const router = express.Router();

// POST /api/auth/login — Autenticação de usuário
router.post('/login', [
  body('email').isEmail().withMessage('E-mail inválido.'),
  body('senha').notEmpty().withMessage('Senha obrigatória.'),
], async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array() });
  }

  const { email, senha } = req.body;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { regiao: true, distrito: true },
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'Credenciais inválidas ou usuário inativo.' });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Credenciais inválidas ou usuário inativo.' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        regiaoId: usuario.regiaoId,
        distritoId: usuario.distritoId,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        regiao: usuario.regiao,
        distrito: usuario.distrito,
      },
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// GET /api/auth/me — Retorna dados do usuário autenticado
router.get('/me', autenticar, async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { regiao: true, distrito: true },
      select: {
        id: true, nome: true, email: true, perfil: true,
        regiao: true, distrito: true, ativo: true,
      },
    });
    res.json(usuario);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar dados do usuário.' });
  }
});

module.exports = router;
