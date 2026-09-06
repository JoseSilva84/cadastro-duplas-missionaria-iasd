// Service de Usuário — Regras de negócio
const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/usuario.model');
const prisma = require('../lib/prisma');
const { PERFIS, ehAdmin } = require('../middlewares/auth');
const { montarIdentidadeUsuario } = require('./usuarioIdentidade.service');

// Perfis reservados à administração da Associação.
const PERFIS_EXCLUSIVOS_ADMIN = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR];
const PERFIS_GESTORES_REGIONAIS = [PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL];
const PERFIS_GERENCIAVEIS_DISTRITO = [PERFIS.PASTOR_DISTRITAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA];
const PERFIS_GERENCIAVEIS_IGREJA = [PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA];

const ehGestorRegional = (perfil) => PERFIS_GESTORES_REGIONAIS.includes(perfil);
const ehGestorDistrital = (perfil) => perfil === PERFIS.PASTOR_DISTRITAL;
const ehGestorIgreja = (perfil) => perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA;

const obterRegiaoIdUsuario = (usuario) => {
  if (usuario?.perfil === PERFIS.PASTOR_DISTRITAL) {
    return usuario?.distrito?.regiaoId || usuario?.regiaoId || null;
  }
  if (usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
    return usuario?.igreja?.distrito?.regiaoId || usuario?.regiaoId || null;
  }
  if (usuario?.perfil === PERFIS.DUPLA_MISSIONARIA) {
    return usuario?.dupla?.distrito?.regiaoId
      || usuario?.dupla?.igreja?.distrito?.regiaoId
      || usuario?.regiaoId
      || null;
  }
  return usuario?.regiaoId || null;
};

const obterDistritoIdUsuario = (usuario) => {
  if (usuario?.perfil === PERFIS.PASTOR_DISTRITAL) return usuario?.distritoId || usuario?.distrito?.id || null;
  if (usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
    return usuario?.igreja?.distritoId || usuario?.distritoId || null;
  }
  if (usuario?.perfil === PERFIS.DUPLA_MISSIONARIA) {
    return usuario?.dupla?.distritoId || usuario?.igreja?.distritoId || usuario?.distritoId || null;
  }
  return null;
};

const obterIgrejaIdUsuario = (usuario) => {
  if (usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) return usuario?.igrejaId || usuario?.igreja?.id || null;
  if (usuario?.perfil === PERFIS.DUPLA_MISSIONARIA) return usuario?.dupla?.igrejaId || usuario?.igrejaId || null;
  return null;
};

async function validarPermissaoGerenciarUsuario(usuarioAtual, usuarioLogado) {
  if (usuarioLogado.perfil === PERFIS.SUPER_ADMIN) return;

  if (usuarioAtual.perfil === PERFIS.SUPER_ADMIN) {
    throw { status: 403, mensagem: 'Apenas um Super Administrador pode gerenciar esta conta.' };
  }
  if (usuarioLogado.perfil === PERFIS.ADMINISTRADOR) return;
  if (ehGestorRegional(usuarioLogado.perfil)) {
    const regiaoIdSolicitante = Number(usuarioLogado.regiaoId);
    const regiaoIdAlvo = Number(obterRegiaoIdUsuario(usuarioAtual));
    if (!regiaoIdSolicitante || !regiaoIdAlvo || regiaoIdAlvo !== regiaoIdSolicitante) {
      throw { status: 403, mensagem: 'Acesso negado: usuário fora da sua região.' };
    }
    if (PERFIS_EXCLUSIVOS_ADMIN.includes(usuarioAtual.perfil)) {
      throw { status: 403, mensagem: 'Sem permissão para gerenciar este usuário.' };
    }
    return;
  }

  if (ehGestorDistrital(usuarioLogado.perfil)) {
    if (!PERFIS_GERENCIAVEIS_DISTRITO.includes(usuarioAtual.perfil)
      || Number(obterDistritoIdUsuario(usuarioAtual)) !== Number(usuarioLogado.distritoId)) {
      throw { status: 403, mensagem: 'Acesso negado: usuário fora do seu distrito.' };
    }
    return;
  }

  if (ehGestorIgreja(usuarioLogado.perfil)) {
    if (!PERFIS_GERENCIAVEIS_IGREJA.includes(usuarioAtual.perfil)
      || Number(obterIgrejaIdUsuario(usuarioAtual)) !== Number(usuarioLogado.igrejaId)) {
      throw { status: 403, mensagem: 'Acesso negado: usuário fora da sua igreja.' };
    }
    return;
  }

  throw { status: 403, mensagem: 'Sem permissão para gerenciar usuários.' };
}

async function validarEscopoUsuarioRegional(data, regiaoIdCriador) {
  if (data.regiaoId && Number(data.regiaoId) !== Number(regiaoIdCriador)) {
    throw { status: 403, mensagem: 'Acesso negado: região fora do seu escopo.' };
  }

  if (data.distritoId) {
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(data.distritoId) },
      select: { regiaoId: true },
    });
    if (!distrito || Number(distrito.regiaoId) !== Number(regiaoIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: distrito fora da sua região.' };
    }
  }

  if (data.igrejaId) {
    const igreja = await prisma.igreja.findUnique({
      where: { id: Number(data.igrejaId) },
      select: { distrito: { select: { regiaoId: true } } },
    });
    if (!igreja || Number(igreja.distrito.regiaoId) !== Number(regiaoIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: igreja fora da sua região.' };
    }
  }

  if (data.duplaId) {
    const dupla = await prisma.dupla.findUnique({
      where: { id: Number(data.duplaId) },
      select: { distrito: { select: { regiaoId: true } } },
    });
    if (!dupla || Number(dupla.distrito.regiaoId) !== Number(regiaoIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: dupla fora da sua região.' };
    }
  }
}

async function validarEscopoUsuarioDistrital(data, distritoIdCriador) {
  if (data.distritoId && Number(data.distritoId) !== Number(distritoIdCriador)) {
    throw { status: 403, mensagem: 'Acesso negado: distrito fora do seu escopo.' };
  }
  if (data.igrejaId) {
    const igreja = await prisma.igreja.findUnique({ where: { id: Number(data.igrejaId) }, select: { distritoId: true } });
    if (!igreja || Number(igreja.distritoId) !== Number(distritoIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: igreja fora do seu distrito.' };
    }
  }
  if (data.duplaId) {
    const dupla = await prisma.dupla.findUnique({ where: { id: Number(data.duplaId) }, select: { distritoId: true } });
    if (!dupla || Number(dupla.distritoId) !== Number(distritoIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: dupla fora do seu distrito.' };
    }
  }
}

async function validarEscopoUsuarioIgreja(data, igrejaIdCriador) {
  if (data.igrejaId && Number(data.igrejaId) !== Number(igrejaIdCriador)) {
    throw { status: 403, mensagem: 'Acesso negado: igreja fora do seu escopo.' };
  }
  if (data.duplaId) {
    const dupla = await prisma.dupla.findUnique({ where: { id: Number(data.duplaId) }, select: { igrejaId: true } });
    if (!dupla || Number(dupla.igrejaId) !== Number(igrejaIdCriador)) {
      throw { status: 403, mensagem: 'Acesso negado: dupla fora da sua igreja.' };
    }
  }
}

const UsuarioService = {
  // Lista todos os usuários (filtrado por escopo do perfil solicitante)
  async listar(usuarioLogado) {
    const { perfil, regiaoId } = usuarioLogado;

    // Admin e Super Admin veem todos
    if (ehAdmin(perfil)) {
      const filtro = perfil === PERFIS.SUPER_ADMIN ? {} : { perfil: { not: PERFIS.SUPER_ADMIN } };
      const usuarios = await UsuarioModel.findAll(filtro);
      return usuarios.map((usuario) => ({ ...usuario, identidade: montarIdentidadeUsuario(usuario) }));
    }

    // Pastor e Coordenador Regional veem apenas usuários da própria região.
    if (ehGestorRegional(perfil) && regiaoId) {
      const regiaoIdNumerica = Number(regiaoId);
      const usuarios = await UsuarioModel.findAll({
        OR: [
          { perfil: { in: PERFIS_GESTORES_REGIONAIS }, regiaoId: regiaoIdNumerica },
          { perfil: PERFIS.PASTOR_DISTRITAL, distrito: { is: { regiaoId: regiaoIdNumerica } } },
          { perfil: PERFIS.DIRETOR_MISSIONARIO_IGREJA, igreja: { is: { distrito: { is: { regiaoId: regiaoIdNumerica } } } } },
          { perfil: PERFIS.DUPLA_MISSIONARIA, dupla: { is: { distrito: { is: { regiaoId: regiaoIdNumerica } } } } },
          { perfil: PERFIS.DUPLA_MISSIONARIA, dupla: { is: { igreja: { is: { distrito: { is: { regiaoId: regiaoIdNumerica } } } } } } },
        ],
      });
      return usuarios.map((usuario) => ({ ...usuario, identidade: montarIdentidadeUsuario(usuario) }));
    }

    if (ehGestorDistrital(perfil) && usuarioLogado.distritoId) {
      const distritoId = Number(usuarioLogado.distritoId);
      const usuarios = await UsuarioModel.findAll({
        OR: [
          { perfil: PERFIS.PASTOR_DISTRITAL, distritoId },
          { perfil: PERFIS.DIRETOR_MISSIONARIO_IGREJA, igreja: { is: { distritoId } } },
          { perfil: PERFIS.DUPLA_MISSIONARIA, dupla: { is: { distritoId } } },
        ],
      });
      return usuarios.map((usuario) => ({ ...usuario, identidade: montarIdentidadeUsuario(usuario) }));
    }

    if (ehGestorIgreja(perfil) && usuarioLogado.igrejaId) {
      const igrejaId = Number(usuarioLogado.igrejaId);
      const usuarios = await UsuarioModel.findAll({
        OR: [
          { perfil: PERFIS.DIRETOR_MISSIONARIO_IGREJA, igrejaId },
          { perfil: PERFIS.DUPLA_MISSIONARIA, dupla: { is: { igrejaId } } },
        ],
      });
      return usuarios.map((usuario) => ({ ...usuario, identidade: montarIdentidadeUsuario(usuario) }));
    }

    // Demais perfis sem acesso à listagem (bloqueado na rota, mas reforçado aqui)
    throw { status: 403, mensagem: 'Sem permissão para listar usuários.' };
  },

  // Cria novo usuário
  async criar(data, usuarioLogado) {
    const {
      perfil: perfilCriador,
      regiaoId: regiaoIdCriador,
      distritoId: distritoIdCriador,
      igrejaId: igrejaIdCriador,
    } = usuarioLogado;

    // O Administrador comum pode gerenciar todos os perfis, exceto Super Admin.
    if (perfilCriador === PERFIS.ADMINISTRADOR && data.perfil === PERFIS.SUPER_ADMIN) {
      throw { status: 403, mensagem: 'Apenas um Super Administrador pode criar este tipo de perfil.' };
    }

    // Gestores regionais só podem criar contas dentro da própria região.
    if (ehGestorRegional(perfilCriador)) {
      if (!regiaoIdCriador) {
        throw { status: 403, mensagem: 'Seu usuário não possui uma região vinculada.' };
      }
      if (PERFIS_EXCLUSIVOS_ADMIN.includes(data.perfil)) {
        throw { status: 403, mensagem: 'Você não tem permissão para criar este tipo de perfil.' };
      }
      // Força o regiaoId do novo usuário a ser o da região do gestor.
      if (!data.regiaoId || Number(data.regiaoId) !== regiaoIdCriador) {
        data.regiaoId = regiaoIdCriador;
      }
      await validarEscopoUsuarioRegional(data, regiaoIdCriador);
    } else if (ehGestorDistrital(perfilCriador)) {
      if (!distritoIdCriador) throw { status: 403, mensagem: 'Seu usuário não possui um distrito vinculado.' };
      if (!PERFIS_GERENCIAVEIS_DISTRITO.includes(data.perfil)) {
        throw { status: 403, mensagem: 'Sem permissão para criar este tipo de perfil.' };
      }
      data.distritoId = distritoIdCriador;
      await validarEscopoUsuarioDistrital(data, distritoIdCriador);
    } else if (ehGestorIgreja(perfilCriador)) {
      if (!igrejaIdCriador) throw { status: 403, mensagem: 'Seu usuário não possui uma igreja vinculada.' };
      if (!PERFIS_GERENCIAVEIS_IGREJA.includes(data.perfil)) {
        throw { status: 403, mensagem: 'Sem permissão para criar este tipo de perfil.' };
      }
      data.igrejaId = igrejaIdCriador;
      await validarEscopoUsuarioIgreja(data, igrejaIdCriador);
    }

    const emailNormalizado = String(data.email || '').trim().toLowerCase();
    if (await UsuarioModel.findByEmail(emailNormalizado)) {
      throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário.' };
    }
    const senhaNormalizada = String(data.senha || '').trim();
    if (senhaNormalizada.length < 8) {
      throw { status: 400, mensagem: 'A senha deve ter pelo menos 8 caracteres.' };
    }
    const hash = await bcrypt.hash(senhaNormalizada, 10);

    try {
      const usuario = await UsuarioModel.create({
        nome: data.nome,
        email: emailNormalizado,
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
    const {
      perfil: perfilCriador,
      regiaoId: regiaoIdCriador,
      distritoId: distritoIdCriador,
      igrejaId: igrejaIdCriador,
    } = usuarioLogado;
    const usuarioAtual = await UsuarioModel.findById(id);
    if (!usuarioAtual) {
      throw { status: 404, mensagem: 'Usuário não encontrado.' };
    }

    // Administradores comuns não podem alterar nem promover contas Super Admin.
    if (perfilCriador !== PERFIS.SUPER_ADMIN
      && (usuarioAtual.perfil === PERFIS.SUPER_ADMIN || data.perfil === PERFIS.SUPER_ADMIN)) {
      throw { status: 403, mensagem: 'Apenas um Super Administrador pode alterar esta conta ou perfil.' };
    }

    await validarPermissaoGerenciarUsuario(usuarioAtual, usuarioLogado);

    if (ehGestorRegional(perfilCriador)) {
      if (Number(obterRegiaoIdUsuario(usuarioAtual)) !== Number(regiaoIdCriador)) {
        throw { status: 403, mensagem: 'Acesso negado: usuário fora da sua região.' };
      }
      if (PERFIS_EXCLUSIVOS_ADMIN.includes(usuarioAtual.perfil)) {
        throw { status: 403, mensagem: 'Sem permissão para alterar este usuário.' };
      }
      if (PERFIS_EXCLUSIVOS_ADMIN.includes(data.perfil)) {
        throw { status: 403, mensagem: 'Sem permissão para atribuir este perfil.' };
      }
      data.regiaoId = regiaoIdCriador;
      await validarEscopoUsuarioRegional(data, regiaoIdCriador);
    } else if (ehGestorDistrital(perfilCriador)) {
      if (!PERFIS_GERENCIAVEIS_DISTRITO.includes(data.perfil)) {
        throw { status: 403, mensagem: 'Sem permissão para atribuir este perfil.' };
      }
      data.distritoId = distritoIdCriador;
      await validarEscopoUsuarioDistrital(data, distritoIdCriador);
    } else if (ehGestorIgreja(perfilCriador)) {
      if (!PERFIS_GERENCIAVEIS_IGREJA.includes(data.perfil)) {
        throw { status: 403, mensagem: 'Sem permissão para atribuir este perfil.' };
      }
      data.igrejaId = igrejaIdCriador;
      await validarEscopoUsuarioIgreja(data, igrejaIdCriador);
    }

    const updateData = {
      nome: data.nome,
      email: String(data.email || '').trim().toLowerCase(),
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

    const donoDoEmail = await UsuarioModel.findByEmail(updateData.email);
    if (donoDoEmail && donoDoEmail.id !== usuarioAtual.id) {
      throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário.' };
    }

    if (data.senha && !ehAdmin(perfilCriador) && !ehGestorRegional(perfilCriador)
      && !ehGestorDistrital(perfilCriador) && !ehGestorIgreja(perfilCriador)) {
      throw { status: 403, mensagem: 'Sem permissão para redefinir senha.' };
    }

    if (data.senha) {
      const senhaNormalizada = String(data.senha).trim();
      if (senhaNormalizada.length < 8) {
        throw { status: 400, mensagem: 'A nova senha deve ter pelo menos 8 caracteres.' };
      }
      updateData.senha = await bcrypt.hash(senhaNormalizada, 10);
    }

    try {
      const usuario = await UsuarioModel.update(id, updateData);
      const { senha: _, ...usuarioSemSenha } = usuario;
      return usuarioSemSenha;
    } catch (err) {
      if (err.code === 'P2002') {
        throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário.' };
      }
      throw err;
    }
  },

  // Redefine senha por gestores autorizados sem expor a senha atual.
  async redefinirSenha(id, senha, usuarioLogado) {
    if (!ehAdmin(usuarioLogado.perfil) && !ehGestorRegional(usuarioLogado.perfil)
      && !ehGestorDistrital(usuarioLogado.perfil) && !ehGestorIgreja(usuarioLogado.perfil)) {
      throw { status: 403, mensagem: 'Sem permissão para redefinir senha.' };
    }
    const usuarioAtual = await UsuarioModel.findById(id);
    if (!usuarioAtual) {
      throw { status: 404, mensagem: 'Usuário não encontrado.' };
    }
    await validarPermissaoGerenciarUsuario(usuarioAtual, usuarioLogado);
    if (usuarioAtual.perfil === PERFIS.SUPER_ADMIN && usuarioLogado.perfil !== PERFIS.SUPER_ADMIN) {
      throw { status: 403, mensagem: 'Apenas um Super Administrador pode redefinir esta senha.' };
    }
    const senhaNormalizada = String(senha || '').trim();
    if (senhaNormalizada.length < 8) {
      throw { status: 400, mensagem: 'A nova senha deve ter pelo menos 8 caracteres.' };
    }

    const hash = await bcrypt.hash(senhaNormalizada, 10);
    const usuario = await UsuarioModel.update(id, { senha: hash });
    const { senha: _, ...usuarioSemSenha } = usuario;
    return usuarioSemSenha;
  },

  // Desativa usuário (soft delete)
  async desativar(id, usuarioLogado) {
    const usuarioAtual = await UsuarioModel.findById(id);
    if (!usuarioAtual) {
      throw { status: 404, mensagem: 'Usuário não encontrado.' };
    }
    await validarPermissaoGerenciarUsuario(usuarioAtual, usuarioLogado);
    if (Number(id) === Number(usuarioLogado.id)) {
      throw { status: 400, mensagem: 'Você não pode desativar o próprio usuário logado.' };
    }
    return UsuarioModel.deactivate(id);
  },

  // Exclui usuário definitivamente
  async excluir(id, usuarioLogado) {
    if (Number(id) === Number(usuarioLogado.id)) {
      throw { status: 400, mensagem: 'Você não pode excluir o próprio usuário logado.' };
    }
    const usuarioAtual = await UsuarioModel.findById(id);
    if (!usuarioAtual) {
      throw { status: 404, mensagem: 'Usuário não encontrado.' };
    }
    await validarPermissaoGerenciarUsuario(usuarioAtual, usuarioLogado);
    return UsuarioModel.remove(id);
  },

  validarPermissaoGerenciarUsuario,
};

module.exports = UsuarioService;
