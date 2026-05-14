// Service de Autenticação — Regras de negócio
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuario.model');

const AuthService = {
  // Realiza login e retorna token + dados do usuário
  async login(email, senha) {
    const usuario = await UsuarioModel.findByEmail(email);

    if (!usuario || !usuario.ativo) {
      throw { status: 401, mensagem: 'Credenciais inválidas ou usuário inativo.' };
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw { status: 401, mensagem: 'Credenciais inválidas ou usuário inativo.' };
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

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        regiao: usuario.regiao,
        distrito: usuario.distrito,
      },
    };
  },

  // Retorna dados do usuário autenticado
  async me(usuarioId) {
    return UsuarioModel.findById(usuarioId);
  },
};

module.exports = AuthService;
