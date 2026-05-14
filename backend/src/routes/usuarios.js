// Rotas de Usuários
const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// GET /api/usuarios — Lista usuários (admin)
router.get('/', autenticar, autorizar('ADMINISTRADOR'), async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true, nome: true, email: true, perfil: true,
        ativo: true, criadoEm: true,
        regiao: { select: { id: true, nome: true } },
        distrito: { select: { id: true, nome: true } },
      },
      orderBy: { nome: 'asc' },
    });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao listar usuários.' });
  }
});

// POST /api/usuarios — Cria novo usuário (admin)
router.post('/', autenticar, autorizar('ADMINISTRADOR'), async (req, res) => {
  const { nome, email, senha, perfil, regiaoId, distritoId } = req.body;
  try {
    const hash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.create({
      data: {
        nome, email, senha: hash, perfil,
        regiaoId: regiaoId ? Number(regiaoId) : null,
        distritoId: distritoId ? Number(distritoId) : null,
      },
    });
    const { senha: _, ...usuarioSemSenha } = usuario;
    res.status(201).json(usuarioSemSenha);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ erro: 'E-mail já cadastrado.' });
    }
    res.status(500).json({ erro: 'Erro ao criar usuário.' });
  }
});

// PUT /api/usuarios/:id — Atualiza usuário (admin)
router.put('/:id', autenticar, autorizar('ADMINISTRADOR'), async (req, res) => {
  const { nome, email, perfil, ativo, regiaoId, distritoId, senha } = req.body;
  try {
    const data = { nome, email, perfil, ativo,
      regiaoId: regiaoId ? Number(regiaoId) : null,
      distritoId: distritoId ? Number(distritoId) : null,
    };
    if (senha) data.senha = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.update({
      where: { id: Number(req.params.id) },
      data,
    });
    const { senha: _, ...usuarioSemSenha } = usuario;
    res.json(usuarioSemSenha);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
  }
});

// DELETE /api/usuarios/:id — Desativa usuário (admin)
router.delete('/:id', autenticar, autorizar('ADMINISTRADOR'), async (req, res) => {
  try {
    await prisma.usuario.update({
      where: { id: Number(req.params.id) },
      data: { ativo: false },
    });
    res.json({ mensagem: 'Usuário desativado com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao desativar usuário.' });
  }
});

module.exports = router;
