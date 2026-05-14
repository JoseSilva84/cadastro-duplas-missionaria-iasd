// Service de Usuário — Regras de negócio
const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/usuario.model');

const UsuarioService = {
  // Lista todos os usuários
  async listar() {
    return UsuarioModel.findAll();
  },

  // Cria novo usuário
  async criar(data) {
    const hash = await bcrypt.hash(data.senha, 10);

    try {
      const usuario = await UsuarioModel.create({
        nome: data.nome,
        email: data.email,
        senha: hash,
        perfil: data.perfil,
        regiaoId: data.regiaoId ? Number(data.regiaoId) : null,
        distritoId: data.distritoId ? Number(data.distritoId) : null,
      });

      const { senha: _, ...usuarioSemSenha } = usuario;
      return usuarioSemSenha;
    } catch (err) {
      if (err.code === 'P2002') {
        throw { status: 400, mensagem: 'E-mail já cadastrado.' };
      }
      throw err;
    }
  },

  // Atualiza usuário
  async atualizar(id, data) {
    const updateData = {
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,
      ativo: data.ativo,
      regiaoId: data.regiaoId ? Number(data.regiaoId) : null,
      distritoId: data.distritoId ? Number(data.distritoId) : null,
    };

    if (data.senha) {
      updateData.senha = await bcrypt.hash(data.senha, 10);
    }

    const usuario = await UsuarioModel.update(id, updateData);
    const { senha: _, ...usuarioSemSenha } = usuario;
    return usuarioSemSenha;
  },

  // Desativa usuário
  async desativar(id) {
    return UsuarioModel.deactivate(id);
  },
};

module.exports = UsuarioService;
