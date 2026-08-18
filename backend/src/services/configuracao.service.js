const prisma = require('../lib/prisma');

const delegateName = (modelName) => modelName.charAt(0).toLowerCase() + modelName.slice(1);

const serializarBackup = (valor) => JSON.stringify(valor, (_chave, item) => (
  typeof item === 'bigint' ? item.toString() : item
), 2);

const ConfiguracaoService = {
  async gerarBackup(usuario) {
    if (usuario?.perfil !== 'SUPER_ADMIN') {
      throw { status: 403, mensagem: 'Backup disponivel apenas para Super Administrador.' };
    }

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
};

module.exports = ConfiguracaoService;
