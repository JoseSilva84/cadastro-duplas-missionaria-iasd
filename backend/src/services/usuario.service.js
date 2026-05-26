// Service de Usuário — Regras de negócio
const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/usuario.model');
const { PERFIS, ehAdmin } = require('../middlewares/auth');

// Perfis que NÃO podem ser criados por Pastor Regional
const PERFIS_EXCLUSIVOS_ADMIN = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR];

const UsuarioService = {
  // Lista todos os usuários (filtrado por escopo do perfil solicitante)
  async listar(usuarioLogado) {
    const { perfil, regiaoId } = usuarioLogado;

    // Admin e Super Admin veem todos
    if (ehAdmin(perfil)) {
      return UsuarioModel.findAll();
    }

    // Pastor Regional vê apenas usuários da sua região
    if (perfil === PERFIS.PASTOR_REGIONAL && regiaoId) {
      return UsuarioModel.findAll({ regiaoId });
    }

    // Demais perfis sem acesso à listagem (bloqueado na rota, mas reforçado aqui)
    throw { status: 403, mensagem: 'Sem permissão para listar usuários.' };
  },

  // Cria novo usuário
  async criar(data, usuarioLogado) {
    const { perfil: perfilCriador, regiaoId: regiaoIdCriador } = usuarioLogado;

    // Pastor Regional só pode criar PD e Coordenadores dentro da sua região
    if (perfilCriador === PERFIS.PASTOR_REGIONAL) {
      if (PERFIS_EXCLUSIVOS_ADMIN.includes(data.perfil)) {
        throw { status: 403, mensagem: 'Você não tem permissão para criar este tipo de perfil.' };
      }
      // Força o regiaoId do novo usuário a ser o da região do Pastor Regional
      if (!data.regiaoId || Number(data.regiaoId) !== regiaoIdCriador) {
        data.regiaoId = regiaoIdCriador;
      }
    }

    const hash = await bcrypt.hash(data.senha, 10);

    try {
      const usuario = await UsuarioModel.create({
        nome: data.nome,
        email: data.email,
        senha: hash,
        perfil: data.perfil,
        regiaoId: data.regiaoId ? Number(data.regiaoId) : null,
        distritoId: data.distritoId ? Number(data.distritoId) : null,
        // Vincula ao ID da dupla quando for perfil DUPLA_MISSIONARIA
        duplaId: data.perfil === PERFIS.DUPLA_MISSIONARIA && data.duplaId
          ? Number(data.duplaId)
          : null,
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
  async atualizar(id, data, usuarioLogado) {
    const { perfil: perfilCriador } = usuarioLogado;

    // Apenas Super Admin pode alterar perfis de outros admins
    if (!ehAdmin(perfilCriador) && PERFIS_EXCLUSIVOS_ADMIN.includes(data.perfil)) {
      throw { status: 403, mensagem: 'Sem permissão para atribuir este perfil.' };
    }

    const updateData = {
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,
      ativo: data.ativo,
      regiaoId: data.regiaoId ? Number(data.regiaoId) : null,
      distritoId: data.distritoId ? Number(data.distritoId) : null,
      duplaId: data.perfil === PERFIS.DUPLA_MISSIONARIA && data.duplaId
        ? Number(data.duplaId)
        : null,
    };

    if (data.senha) {
      updateData.senha = await bcrypt.hash(data.senha, 10);
    }

    const usuario = await UsuarioModel.update(id, updateData);
    const { senha: _, ...usuarioSemSenha } = usuario;
    return usuarioSemSenha;
  },

  // Desativa usuário (soft delete)
  async desativar(id) {
    return UsuarioModel.deactivate(id);
  },
};

module.exports = UsuarioService;
