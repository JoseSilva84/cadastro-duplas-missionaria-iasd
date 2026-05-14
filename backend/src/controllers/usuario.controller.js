// Controller de Usuário — Entrada e saída HTTP
const UsuarioService = require('../services/usuario.service');

const UsuarioController = {
  // GET /api/usuarios
  async listar(req, res) {
    try {
      const usuarios = await UsuarioService.listar();
      res.json(usuarios);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao listar usuários.' });
    }
  },

  // POST /api/usuarios
  async criar(req, res) {
    try {
      const usuario = await UsuarioService.criar(req.body);
      res.status(201).json(usuario);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao criar usuário.' });
    }
  },

  // PUT /api/usuarios/:id
  async atualizar(req, res) {
    try {
      const usuario = await UsuarioService.atualizar(req.params.id, req.body);
      res.json(usuario);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao atualizar usuário.' });
    }
  },

  // DELETE /api/usuarios/:id
  async desativar(req, res) {
    try {
      await UsuarioService.desativar(req.params.id);
      res.json({ mensagem: 'Usuário desativado com sucesso.' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao desativar usuário.' });
    }
  },
};

module.exports = UsuarioController;
