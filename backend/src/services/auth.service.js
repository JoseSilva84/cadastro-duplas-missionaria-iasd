const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuario.model');

const AuthService = {
  async login(email, senha) {
    const usuario = await UsuarioModel.findByEmail(email);

    if (!usuario || !usuario.ativo) {
      throw { status: 401, mensagem: 'Credenciais inválidas ou usuário inativo.' };
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      throw { status: 401, mensagem: 'Credenciais inválidas ou usuário inativo.' };
    }

    const igrejaId = usuario.igrejaId || usuario.dupla?.igrejaId || null;

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        regiaoId: usuario.regiaoId,
        distritoId: usuario.distritoId,
        duplaId: usuario.duplaId,
        igrejaId,
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
        regiaoId: usuario.regiaoId,
        distritoId: usuario.distritoId,
        duplaId: usuario.duplaId,
        igrejaId,
        regiao: usuario.regiao,
        distrito: usuario.distrito,
        dupla: usuario.dupla,
        igreja: usuario.igreja,
      },
    };
  },

  async me(usuarioId) {
    return UsuarioModel.findById(usuarioId);
  },
};

module.exports = AuthService;
