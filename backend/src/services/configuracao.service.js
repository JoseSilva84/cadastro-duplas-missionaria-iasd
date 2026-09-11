const prisma = require('../lib/prisma');

const delegateName = (modelName) => modelName.charAt(0).toLowerCase() + modelName.slice(1);

const RESTORE_DELETE_ORDER = [
  'EscolaSabatinaDupla',
  'DuplaAcompanhamento',
  'Participante',
  'AtaDupla',
  'Evangelismo',
  'EstudoBiblico',
  'MapaIgreja',
  'EscolaSabatinaCadastro',
  'AcompanhamentoDupla',
  'Usuario',
  'Dupla',
  'Igreja',
  'Distrito',
  'Regiao',
  'EscolaSabatinaResumo',
];

const RESTORE_CREATE_ORDER = [
  'Regiao',
  'Distrito',
  'Igreja',
  'Dupla',
  'Usuario',
  'MapaIgreja',
  'AtaDupla',
  'EstudoBiblico',
  'Participante',
  'Evangelismo',
  'AcompanhamentoDupla',
  'DuplaAcompanhamento',
  'EscolaSabatinaCadastro',
  'EscolaSabatinaDupla',
  'EscolaSabatinaResumo',
];

const MODELOS_COM_SEQUENCIA = RESTORE_CREATE_ORDER.filter((modelName) => modelName !== 'EscolaSabatinaResumo');

const serializarBackup = (valor) => JSON.stringify(valor, (_chave, item) => (
  typeof item === 'bigint' ? item.toString() : item
), 2);

const validarSuperAdmin = (usuario) => {
  if (usuario?.perfil !== 'SUPER_ADMIN') {
    throw { status: 403, mensagem: 'Disponivel apenas para Super Administrador.' };
  }
};

const validarBackup = (backup) => {
  if (!backup || typeof backup !== 'object') {
    throw { status: 400, mensagem: 'Arquivo de backup invalido.' };
  }
  if (backup.tipo !== 'backup-json-prisma' || backup.versao !== 1 || !backup.dados || typeof backup.dados !== 'object') {
    throw { status: 400, mensagem: 'Este arquivo nao parece ser um backup valido do sistema.' };
  }
};

const resetarSequencia = async (tx, modelName) => {
  await tx.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${modelName}"', 'id'),
      COALESCE((SELECT MAX("id") FROM "${modelName}"), 1),
      (SELECT COUNT(*) > 0 FROM "${modelName}")
    )
  `);
};

const ConfiguracaoService = {
  async gerarBackup(usuario) {
    validarSuperAdmin(usuario);

    const modelos = Object.keys(prisma._runtimeDataModel?.models || {}).sort();
    const dados = {};
    const totais = {};

    for (const modelName of modelos) {
      const delegate = prisma[delegateName(modelName)];
      if (!delegate?.findMany) continue;
      const registros = await delegate.findMany({ orderBy: { id: 'asc' } }).catch(() => delegate.findMany());
      dados[modelName] = registros;
      totais[modelName] = registros.length;
    }

    const geradoEm = new Date().toISOString();
    const backup = {
      sistema: 'Duplas Missionarias - Associacao Paulistana',
      tipo: 'backup-json-prisma',
      versao: 1,
      geradoEm,
      geradoPor: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
      totais,
      dados,
    };

    return {
      nomeArquivo: `backup-duplas-missionarias-${geradoEm.replace(/[:.]/g, '-')}.json`,
      conteudo: serializarBackup(backup),
    };
  },

  async restaurarBackup(usuario, backup) {
    validarSuperAdmin(usuario);
    validarBackup(backup);

    const dados = backup.dados;
    const totais = {};

    await prisma.$transaction(async (tx) => {
      for (const modelName of RESTORE_DELETE_ORDER) {
        const delegate = tx[delegateName(modelName)];
        if (delegate?.deleteMany) await delegate.deleteMany({});
      }

      for (const modelName of RESTORE_CREATE_ORDER) {
        const registros = Array.isArray(dados[modelName]) ? dados[modelName] : [];
        const delegate = tx[delegateName(modelName)];
        if (!delegate?.createMany || registros.length === 0) {
          totais[modelName] = 0;
          continue;
        }

        await delegate.createMany({ data: registros });
        totais[modelName] = registros.length;
      }

      for (const modelName of MODELOS_COM_SEQUENCIA) {
        if ((Array.isArray(dados[modelName]) ? dados[modelName] : []).some((registro) => registro.id !== undefined)) {
          await resetarSequencia(tx, modelName);
        }
      }
    }, { timeout: 60000 });

    return {
      mensagem: 'Backup restaurado com sucesso.',
      restauradoEm: new Date().toISOString(),
      origem: {
        geradoEm: backup.geradoEm || null,
        geradoPor: backup.geradoPor || null,
      },
      totais,
    };
  },

  async listarChavesAcesso(usuario) {
    const perfil = usuario?.perfil;

    if (perfil === 'SUPER_ADMIN' || perfil === 'ADMINISTRADOR') {
      const [regioes, distritos] = await Promise.all([
        prisma.regiao.findMany({
          select: { id: true, nome: true, chaveAcesso: true, chaveAtiva: true },
          orderBy: { id: 'asc' },
        }),
        prisma.distrito.findMany({
          select: {
            id: true,
            nome: true,
            regiaoId: true,
            regiao: { select: { id: true, nome: true } },
            chaveAcesso: true,
            chaveAtiva: true,
            nomePastor: true,
            telefonePastor: true,
          },
          orderBy: { nome: 'asc' },
        }),
      ]);
      return { tipoUsuario: 'ADMIN', regioes, distritos };
    }

    if (perfil === 'PASTOR_REGIONAL' || perfil === 'COORDENADOR_REGIONAL') {
      let regiaoId = usuario.regiaoId;
      if (!regiaoId && usuario.distritoId) {
        const d = await prisma.distrito.findUnique({ where: { id: usuario.distritoId }, select: { regiaoId: true } });
        regiaoId = d?.regiaoId;
      }
      if (!regiaoId) {
        throw { status: 400, mensagem: 'Região do usuário não identificada.' };
      }

      const [regiao, distritos] = await Promise.all([
        prisma.regiao.findUnique({
          where: { id: Number(regiaoId) },
          select: { id: true, nome: true, chaveAcesso: true, chaveAtiva: true },
        }),
        prisma.distrito.findMany({
          where: { regiaoId: Number(regiaoId) },
          select: {
            id: true,
            nome: true,
            regiaoId: true,
            chaveAcesso: true,
            chaveAtiva: true,
            nomePastor: true,
            telefonePastor: true,
          },
          orderBy: { nome: 'asc' },
        }),
      ]);

      return { tipoUsuario: 'REGIONAL', regiao, distritos };
    }

    if (perfil === 'PASTOR_DISTRITAL' || perfil === 'DIRETOR_MISSIONARIO_IGREJA') {
      let distritoId = usuario.distritoId;
      if (!distritoId && usuario.igrejaId) {
        const i = await prisma.igreja.findUnique({ where: { id: usuario.igrejaId }, select: { distritoId: true } });
        distritoId = i?.distritoId;
      }
      if (!distritoId) {
        throw { status: 400, mensagem: 'Distrito do usuário não identificado.' };
      }

      const distrito = await prisma.distrito.findUnique({
        where: { id: Number(distritoId) },
        select: {
          id: true,
          nome: true,
          regiaoId: true,
          regiao: { select: { id: true, nome: true } },
          chaveAcesso: true,
          chaveAtiva: true,
          nomePastor: true,
          telefonePastor: true,
        },
      });

      return { tipoUsuario: 'DISTRITAL', distrito };
    }

    throw { status: 403, mensagem: 'Você não tem permissão para visualizar chaves de acesso.' };
  },

  async atualizarChaveAcesso(usuario, dados) {
    const { tipo, id, chaveAcesso, chaveAtiva } = dados;
    const perfil = usuario?.perfil;
    const idNum = Number(id);

    if (!['REGIAO', 'DISTRITO'].includes(tipo) || !idNum) {
      throw { status: 400, mensagem: 'Dados inválidos para atualizar chave.' };
    }

    const chaveFormatada = String(chaveAcesso || '').trim().toUpperCase();
    if (!chaveFormatada) {
      throw { status: 400, mensagem: 'A chave de acesso não pode ser vazia.' };
    }

    // Validação de permissões
    const ehAdmin = ['SUPER_ADMIN', 'ADMINISTRADOR'].includes(perfil);
    if (!ehAdmin) {
      if (['PASTOR_REGIONAL', 'COORDENADOR_REGIONAL'].includes(perfil)) {
        if (tipo === 'REGIAO' && Number(usuario.regiaoId) !== idNum) {
          throw { status: 403, mensagem: 'Você só pode alterar a chave da sua própria região.' };
        }
        if (tipo === 'DISTRITO') {
          const d = await prisma.distrito.findUnique({ where: { id: idNum }, select: { regiaoId: true } });
          if (!d || Number(d.regiaoId) !== Number(usuario.regiaoId)) {
            throw { status: 403, mensagem: 'Você só pode alterar distritos da sua região.' };
          }
        }
      } else if (perfil === 'PASTOR_DISTRITAL') {
        if (tipo !== 'DISTRITO' || Number(usuario.distritoId) !== idNum) {
          throw { status: 403, mensagem: 'Você só pode alterar a chave do seu próprio distrito.' };
        }
      } else {
        throw { status: 403, mensagem: 'Sem permissão para alterar chaves de acesso.' };
      }
    }

    // Validação de duplicidade da chave
    const [regiaoExistente, distritoExistente] = await Promise.all([
      prisma.regiao.findFirst({
        where: {
          chaveAcesso: { equals: chaveFormatada, mode: 'insensitive' },
          ...(tipo === 'REGIAO' ? { NOT: { id: idNum } } : {}),
        },
        select: { id: true, nome: true },
      }),
      prisma.distrito.findFirst({
        where: {
          chaveAcesso: { equals: chaveFormatada, mode: 'insensitive' },
          ...(tipo === 'DISTRITO' ? { NOT: { id: idNum } } : {}),
        },
        select: { id: true, nome: true },
      }),
    ]);

    if (regiaoExistente) {
      throw { status: 400, mensagem: `A chave "${chaveFormatada}" já está sendo usada pela Região ${regiaoExistente.nome}.` };
    }
    if (distritoExistente) {
      throw { status: 400, mensagem: `A chave "${chaveFormatada}" já está sendo usada pelo Distrito ${distritoExistente.nome}.` };
    }

    if (tipo === 'REGIAO') {
      return prisma.regiao.update({
        where: { id: idNum },
        data: {
          chaveAcesso: chaveFormatada,
          ...(chaveAtiva !== undefined ? { chaveAtiva: Boolean(chaveAtiva) } : {}),
        },
      });
    }

    return prisma.distrito.update({
      where: { id: idNum },
      data: {
        chaveAcesso: chaveFormatada,
        ...(chaveAtiva !== undefined ? { chaveAtiva: Boolean(chaveAtiva) } : {}),
      },
    });
  },
};

module.exports = ConfiguracaoService;
