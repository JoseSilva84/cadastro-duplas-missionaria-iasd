// Service de Usuário — Regras de negócio
const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/usuario.model');
const prisma = require('../lib/prisma');
const { PERFIS, ehAdmin } = require('../middlewares/auth');

// Perfis que NÃO podem ser criados por Pastor Regional
const PERFIS_EXCLUSIVOS_ADMIN = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR];

async function validarEscopoUsuarioRegional(data, regiaoIdCriador) {
  if (data.regiaoId && Number(data.regiaoId) !== Number(regiaoIdCriador)) {
    throw { status: 403, mensagem: 'Acesso negado: regiÃ£o fora do seu escopo.' };
  }

  if (data.distritoId) {
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(data.distritoId) },
      select: { regiaoId: true },
    });
    if (!distrito || Number(distrito.regiaoId) !== Number(regiaoIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: distrito fora da sua regiÃ£o.' };
    }
  }

  if (data.igrejaId) {
    const igreja = await prisma.igreja.findUnique({
      where: { id: Number(data.igrejaId) },
      select: { distrito: { select: { regiaoId: true } } },
    });
    if (!igreja || Number(igreja.distrito.regiaoId) !== Number(regiaoIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: igreja fora da sua regiÃ£o.' };
    }
  }

  if (data.duplaId) {
    const dupla = await prisma.dupla.findUnique({
      where: { id: Number(data.duplaId) },
      select: { distrito: { select: { regiaoId: true } } },
    });
    if (!dupla || Number(dupla.distrito.regiaoId) !== Number(regiaoIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: dupla fora da sua regiÃ£o.' };
    }
  }
}

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
      await validarEscopoUsuarioRegional(data, regiaoIdCriador);
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
        igrejaId: data.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA && data.igrejaId
          ? Number(data.igrejaId)
          : null,
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
    const { perfil: perfilCriador, regiaoId: regiaoIdCriador } = usuarioLogado;
    const usuarioAtual = await UsuarioModel.findById(id);
    if (!usuarioAtual) {
      throw { status: 404, mensagem: 'UsuÃ¡rio nÃ£o encontrado.' };
    }

    // Apenas Super Admin pode alterar perfis de outros admins
    if (!ehAdmin(perfilCriador) && PERFIS_EXCLUSIVOS_ADMIN.includes(data.perfil)) {
      throw { status: 403, mensagem: 'Sem permissão para atribuir este perfil.' };
    }

    if (perfilCriador === PERFIS.PASTOR_REGIONAL) {
      if (Number(usuarioAtual.regiaoId) !== Number(regiaoIdCriador)) {
        throw { status: 403, mensagem: 'Acesso negado: usuÃ¡rio fora da sua regiÃ£o.' };
      }
      if (PERFIS_EXCLUSIVOS_ADMIN.includes(usuarioAtual.perfil)) {
        throw { status: 403, mensagem: 'Sem permissÃ£o para alterar este usuÃ¡rio.' };
      }
      if (PERFIS_EXCLUSIVOS_ADMIN.includes(data.perfil)) {
        throw { status: 403, mensagem: 'Sem permissÃ£o para atribuir este perfil.' };
      }
      data.regiaoId = regiaoIdCriador;
      await validarEscopoUsuarioRegional(data, regiaoIdCriador);
    }

    const updateData = {
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,
      ativo: data.ativo,
      regiaoId: data.regiaoId ? Number(data.regiaoId) : null,
      distritoId: data.distritoId ? Number(data.distritoId) : null,
      igrejaId: data.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA && data.igrejaId
        ? Number(data.igrejaId)
        : null,
      duplaId: data.perfil === PERFIS.DUPLA_MISSIONARIA && data.duplaId
        ? Number(data.duplaId)
        : null,
    };

    if (data.senha && !ehAdmin(perfilCriador)) {
      throw { status: 403, mensagem: 'Sem permissão para redefinir senha.' };
    }

    if (data.senha) {
      updateData.senha = await bcrypt.hash(data.senha, 10);
    }

    const usuario = await UsuarioModel.update(id, updateData);
    const { senha: _, ...usuarioSemSenha } = usuario;
    return usuarioSemSenha;
  },

  // Redefine senha por administradores sem expor a senha atual
  async redefinirSenha(id, senha, usuarioLogado) {
    if (!ehAdmin(usuarioLogado.perfil)) {
      throw { status: 403, mensagem: 'Sem permissão para redefinir senha.' };
    }
    if (!senha || String(senha).length < 8) {
      throw { status: 400, mensagem: 'A nova senha deve ter pelo menos 8 caracteres.' };
    }

    const hash = await bcrypt.hash(String(senha), 10);
    const usuario = await UsuarioModel.update(id, { senha: hash });
    const { senha: _, ...usuarioSemSenha } = usuario;
    return usuarioSemSenha;
  },

  // Desativa usuário (soft delete)
  async desativar(id) {
    return UsuarioModel.deactivate(id);
  },

  // Exclui usuário definitivamente
  async excluir(id, usuarioLogado) {
    if (Number(id) === Number(usuarioLogado.id)) {
      throw { status: 400, mensagem: 'Você não pode excluir o próprio usuário logado.' };
    }
    return UsuarioModel.remove(id);
  },
};

module.exports = UsuarioService;
