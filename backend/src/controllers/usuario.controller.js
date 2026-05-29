// Controller de UsuÃ¡rio â€” Entrada e saÃ­da HTTP
const UsuarioService = require('../services/usuario.service');

const UsuarioController = {
  // GET /api/usuarios â€” filtrado por perfil do usuÃ¡rio logado
  async listar(req, res) {
    try {
      const usuarios = await UsuarioService.listar(req.usuario);
      res.json(usuarios);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao listar usuÃ¡rios.' });
    }
  },

  // POST /api/usuarios â€” contexto do usuÃ¡rio logado para validar permissÃµes
  async criar(req, res) {
    try {
      const usuario = await UsuarioService.criar(req.body, req.usuario);
      res.status(201).json(usuario);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao criar usuÃ¡rio.' });
    }
  },

  // PUT /api/usuarios/:id â€” contexto do usuÃ¡rio logado para validar perfil atribuÃ­do
  async atualizar(req, res) {
    try {
      const usuario = await UsuarioService.atualizar(req.params.id, req.body, req.usuario);
      res.json(usuario);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao atualizar usuÃ¡rio.' });
    }
  },

  // PATCH /api/usuarios/:id/senha
  async redefinirSenha(req, res) {
    try {
      const usuario = await UsuarioService.redefinirSenha(req.params.id, req.body.senha, req.usuario);
      res.json({ mensagem: 'Senha redefinida com sucesso.', usuario });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao redefinir senha.' });
    }
  },

  // DELETE /api/usuarios/:id
  // DELETE /api/usuarios/:id
  async desativar(req, res) {
    try {
      if (req.query.permanente === 'true') {
        await UsuarioService.excluir(req.params.id, req.usuario);
        return res.json({ mensagem: 'Usuario excluido com sucesso.' });
      }
      await UsuarioService.desativar(req.params.id);
      res.json({ mensagem: 'Usuario desativado com sucesso.' });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao processar usuario.' });
    }
  },
};

module.exports = UsuarioController;
