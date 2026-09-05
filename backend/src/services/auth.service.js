const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuario.model');
const { ehSomenteLeitura } = require('../middlewares/auth');

const AuthService = {
  async login(email, senha) {
    const usuario = await UsuarioModel.findByEmail(email);

    if (!usuario || !usuario.ativo) {
      throw { status: 401, mensagem: 'Credenciais inválidas ou usuário inativo.' };
    }

    // Ignora espaços acidentais ao copiar/colar a senha.
    // Espaços internos continuam fazendo parte da senha.
    const senhaNormalizada = String(senha ?? '').trim();
    const senhaValida = await bcrypt.compare(senhaNormalizada, usuario.senha);
    if (!senhaValida) {
      throw { status: 401, mensagem: 'Credenciais inválidas ou usuário inativo.' };
    }

    const igrejaId = usuario.igrejaId || usuario.dupla?.igrejaId || null;
    const somenteLeitura = ehSomenteLeitura(usuario);

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
        somenteLeitura,
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
        somenteLeitura,
        regiao: usuario.regiao,
        distrito: usuario.distrito,
        dupla: usuario.dupla,
        igreja: usuario.igreja,
      },
    };
  },

  async me(usuarioId) {
    const usuario = await UsuarioModel.findById(usuarioId);
    if (!usuario) return usuario;
    return { ...usuario, somenteLeitura: ehSomenteLeitura(usuario) };
  },
};

module.exports = AuthService;
