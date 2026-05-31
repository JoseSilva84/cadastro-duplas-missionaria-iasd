const prisma = require('../lib/prisma');
const { PERFIS, ehAdmin } = require('../middlewares/auth');

const semAcesso = { id: -1 };

async function obterIgrejaDaDupla(usuario) {
  if (!usuario || usuario.perfil !== PERFIS.DUPLA_MISSIONARIA || !usuario.duplaId) {
    return null;
  }

  return prisma.dupla.findUnique({
    where: { id: Number(usuario.duplaId) },
    select: { id: true, igrejaId: true, distritoId: true },
  });
}

async function montarEscopo(usuario) {
  if (!usuario || ehAdmin(usuario.perfil)) {
    return {
      regiao: {},
      distrito: {},
      igreja: {},
      dupla: {},
      estudo: {},
      escolaSabatina: {},
    };
  }

  if (usuario.perfil === PERFIS.PASTOR_REGIONAL || usuario.perfil === PERFIS.COORDENADOR_REGIONAL) {
    if (!usuario.regiaoId) return negarTudo();
    return {
      regiao: { id: Number(usuario.regiaoId) },
      distrito: { regiaoId: Number(usuario.regiaoId) },
      igreja: { distrito: { is: { regiaoId: Number(usuario.regiaoId) } } },
      dupla: { distrito: { is: { regiaoId: Number(usuario.regiaoId) } } },
      estudo: { dupla: { is: { distrito: { is: { regiaoId: Number(usuario.regiaoId) } } } } },
      escolaSabatina: { distrito: { is: { regiaoId: Number(usuario.regiaoId) } } },
    };
  }

  if (usuario.perfil === PERFIS.PASTOR_DISTRITAL) {
    if (!usuario.distritoId) return negarTudo();
    return {
      regiao: semAcesso,
      distrito: { id: Number(usuario.distritoId) },
      igreja: { distritoId: Number(usuario.distritoId) },
      dupla: { distritoId: Number(usuario.distritoId) },
      estudo: { dupla: { is: { distritoId: Number(usuario.distritoId) } } },
      escolaSabatina: { distritoId: Number(usuario.distritoId) },
    };
  }

  if (usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
    if (!usuario.igrejaId) return negarTudo();
    const igreja = await prisma.igreja.findUnique({
      where: { id: Number(usuario.igrejaId) },
      select: { id: true, distritoId: true },
    });
    if (!igreja) return negarTudo();
    return {
      regiao: semAcesso,
      distrito: { id: Number(igreja.distritoId) },
      igreja: { id: Number(igreja.id) },
      dupla: { igrejaId: Number(igreja.id) },
      estudo: { dupla: { is: { igrejaId: Number(igreja.id) } } },
      escolaSabatina: { igrejaId: Number(igreja.id) },
      igrejaId: Number(igreja.id),
      distritoId: Number(igreja.distritoId),
    };
  }

  if (usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
    const dupla = await obterIgrejaDaDupla(usuario);
    if (!usuario.duplaId) {
      return {
        regiao: {},
        distrito: {},
        igreja: {},
        dupla: {},
        estudo: {},
        escolaSabatina: {},
      };
    }
    if (!dupla?.igrejaId) return negarTudo();
    return {
      regiao: semAcesso,
      distrito: { id: Number(dupla.distritoId) },
      igreja: { id: Number(dupla.igrejaId) },
      dupla: { igrejaId: Number(dupla.igrejaId) },
      estudo: { dupla: { is: { igrejaId: Number(dupla.igrejaId) } } },
      escolaSabatina: { igrejaId: Number(dupla.igrejaId) },
      igrejaId: Number(dupla.igrejaId),
      distritoId: Number(dupla.distritoId),
    };
  }

  return negarTudo();
}

function negarTudo() {
  return {
    regiao: semAcesso,
    distrito: semAcesso,
    igreja: semAcesso,
    dupla: semAcesso,
    estudo: { dupla: { is: semAcesso } },
    escolaSabatina: semAcesso,
  };
}

function combinar(...condicoes) {
  const validas = condicoes.filter((condicao) => condicao && Object.keys(condicao).length > 0);
  if (validas.length === 0) return {};
  if (validas.length === 1) return validas[0];
  return { AND: validas };
}

function validarRegiao(usuario, regiaoId) {
  if (!usuario || ehAdmin(usuario.perfil)) return;
  if (
    (usuario.perfil === PERFIS.PASTOR_REGIONAL || usuario.perfil === PERFIS.COORDENADOR_REGIONAL) &&
    Number(regiaoId) !== Number(usuario.regiaoId)
  ) {
    throw { status: 403, mensagem: 'Acesso negado: região fora do seu escopo.' };
  }
}

async function validarDistrito(usuario, distritoId) {
  if (!usuario || ehAdmin(usuario.perfil)) return;
  const distrito = await prisma.distrito.findUnique({
    where: { id: Number(distritoId) },
    select: { id: true, regiaoId: true },
  });
  if (!distrito) throw { status: 404, mensagem: 'Distrito não encontrado.' };

  if (usuario.perfil === PERFIS.PASTOR_DISTRITAL && distrito.id !== Number(usuario.distritoId)) {
    throw { status: 403, mensagem: 'Acesso negado: distrito fora do seu escopo.' };
  }
  if (usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
    const escopo = await montarEscopo(usuario);
    if (distrito.id !== escopo.distritoId) {
      throw { status: 403, mensagem: 'Acesso negado: distrito fora do seu escopo.' };
    }
    return;
  }
  validarRegiao(usuario, distrito.regiaoId);
}

async function validarIgreja(usuario, igrejaId) {
  if (!usuario || ehAdmin(usuario.perfil)) return;
  const igreja = await prisma.igreja.findUnique({
    where: { id: Number(igrejaId) },
    select: { id: true, distritoId: true, distrito: { select: { regiaoId: true } } },
  });
  if (!igreja) throw { status: 404, mensagem: 'Igreja não encontrada.' };

  if (usuario.perfil === PERFIS.DUPLA_MISSIONARIA || usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
    if (usuario.perfil === PERFIS.DUPLA_MISSIONARIA && !usuario.duplaId) return;
    const escopo = await montarEscopo(usuario);
    if (igreja.id !== escopo.igrejaId) {
      throw { status: 403, mensagem: 'Acesso negado: igreja fora do seu escopo.' };
    }
    return;
  }

  if (usuario.perfil === PERFIS.PASTOR_DISTRITAL && igreja.distritoId !== Number(usuario.distritoId)) {
    throw { status: 403, mensagem: 'Acesso negado: igreja fora do seu distrito.' };
  }
  validarRegiao(usuario, igreja.distrito.regiaoId);
}

module.exports = {
  montarEscopo,
  combinar,
  validarRegiao,
  validarDistrito,
  validarIgreja,
};
