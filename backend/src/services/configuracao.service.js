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
};

module.exports = ConfiguracaoService;
