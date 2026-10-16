const test = require('node:test');
const assert = require('node:assert/strict');
const criarEspelho = require('../src/services/interessadosNovoTempo.mirror');

const dependencias = (db, requisitar = async () => { throw new Error('A API externa não deveria ser chamada.'); }) => ({
  db,
  configuracao: () => ({ token: 'teste', cacheTtl: 300000 }),
  possuiCredencial: () => true,
  requisitar,
  registrosInteressados: (resposta) => resposta.records,
  normalizarRegistro: (registro) => ({
    ...registro,
    temWhatsapp: Boolean(registro.whatsapp),
    vipHistorico: false,
    estudoAtivo: false,
    prioridade: 'hot',
  }),
  extrairTerritorio: () => ({ igrejas: [], distritosOficiais: [] }),
  aplicarGeolocalizacaoAproximada: (contatos) => ({ contatos, igrejas: [] }),
  chaveNormalizada: (valor) => String(valor || '').toLowerCase(),
});

test('consulta distritos e a segunda página no banco local sem chamar o Amigos NT', async () => {
  let chamadasExternas = 0;
  const linhas = Array.from({ length: 80 }, (_, indice) => ({
    id: String(indice), dados: { id: String(indice), nome: `Pessoa ${indice}` },
  }));
  const db = {
    sincronizacaoNovoTempo: {
      findUnique: async () => ({ loteAtivo: 'lote-1', atualizadoEm: new Date('2026-10-16T12:00:00Z'), status: 'PRONTO' }),
    },
    $queryRaw: async (consulta) => {
      assert.equal(consulta.values[0], 'lote-1');
      assert.ok(consulta.values.includes('centro'));
      return [{
        nome: 'Centro', chave: 'centro', total: 80, comWhatsapp: 30,
        vipsHistoricos: 2, estudosAtivos: 5, quentes: 10,
        potenciais: 20, mornos: 30, frios: 20,
      }];
    },
    interessadoNovoTempo: {
      findMany: async ({ where, skip, take, orderBy }) => {
        assert.equal(where.loteId, 'lote-1');
        assert.deepEqual(where.AND, [
          { distritoChave: { in: ['centro'] } },
          { distritoChave: 'centro' },
        ]);
        assert.deepEqual(orderBy, [{ nome: 'asc' }, { id: 'asc' }]);
        return linhas.slice(skip, skip + take);
      },
    },
  };
  const espelho = criarEspelho(dependencias(db, async () => { chamadasExternas += 1; }));
  const escopo = { acessoTotal: false, distritos: new Set(['centro']) };

  const resumo = await espelho.resumo(escopo);
  const pagina = await espelho.porDistrito('Centro', escopo, { pagina: 2, limite: 50, versao: 'lote-1' });
  const expirada = await espelho.porDistrito('Centro', escopo, { pagina: 2, limite: 50, versao: 'lote-antigo' });

  assert.equal(resumo.resumo.totalInteressados, 80);
  assert.equal(pagina.leads.length, 30);
  assert.equal(pagina.temMais, false);
  assert.equal(pagina.versao, 'lote-1');
  assert.deepEqual(expirada, { versaoExpirada: true });
  assert.equal(chamadasExternas, 0);
});

test('publica o novo lote somente depois de gravar todos os contatos', async () => {
  const estado = {
    id: 'principal', loteAtivo: 'lote-anterior', loteAnterior: null,
    proximaTentativaEm: new Date(0), ultimaTentativaEm: null,
    bloqueioAte: null, execucaoId: null, falhas: 0, status: 'PRONTO',
  };
  const gravados = [];
  let chamadasExternas = 0;
  const db = {
    sincronizacaoNovoTempo: {
      upsert: async () => ({ ...estado }),
      findUnique: async () => ({ ...estado }),
      updateMany: async ({ where, data }) => {
        if (where.execucaoId && where.execucaoId !== estado.execucaoId) return { count: 0 };
        if (data.loteAtivo) assert.equal(gravados.length, 2);
        Object.assign(estado, data);
        return { count: 1 };
      },
    },
    interessadoNovoTempo: {
      createMany: async ({ data }) => {
        assert.equal(estado.loteAtivo, 'lote-anterior');
        gravados.push(...data);
      },
      deleteMany: async () => ({ count: 0 }),
    },
  };
  const espelho = criarEspelho(dependencias(db, async () => {
    chamadasExternas += 1;
    return { records: [
      { id: '1', nome: 'Ana', distrito: 'Centro' },
      { id: '2', nome: 'Bia', distrito: 'Centro' },
    ] };
  }));

  assert.equal(await espelho.solicitar(), true);
  for (let tentativa = 0; tentativa < 20 && (gravados.length < 2 || estado.status !== 'PRONTO'); tentativa += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(estado.status, 'PRONTO');
  assert.equal(gravados.length, 2);
  assert.equal(estado.loteAnterior, 'lote-anterior');
  assert.notEqual(estado.loteAtivo, 'lote-anterior');
  assert.equal(chamadasExternas, 1);
});

test('mantém o lote anterior e aguarda antes de repetir uma sincronização com falha', async () => {
  const estado = {
    id: 'principal', loteAtivo: 'lote-anterior', loteAnterior: null,
    proximaTentativaEm: new Date(0), ultimaTentativaEm: null,
    bloqueioAte: null, execucaoId: null, falhas: 0, status: 'PRONTO',
  };
  let chamadasExternas = 0;
  const db = {
    sincronizacaoNovoTempo: {
      upsert: async () => ({ ...estado }),
      findUnique: async () => ({ ...estado }),
      updateMany: async ({ where, data }) => {
        if (where.execucaoId && where.execucaoId !== estado.execucaoId) return { count: 0 };
        const agendamento = where.AND?.[1];
        if (agendamento?.proximaTentativaEm && estado.proximaTentativaEm > agendamento.proximaTentativaEm.lte) {
          return { count: 0 };
        }
        Object.assign(estado, data);
        return { count: 1 };
      },
    },
    interessadoNovoTempo: { deleteMany: async () => ({ count: 0 }) },
  };
  const espelho = criarEspelho(dependencias(db, async () => {
    chamadasExternas += 1;
    throw new Error('Origem indisponível');
  }));

  assert.equal(await espelho.solicitar(), true);
  for (let tentativa = 0; tentativa < 20 && estado.status !== 'ERRO'; tentativa += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(estado.status, 'ERRO');
  assert.equal(estado.loteAtivo, 'lote-anterior');
  assert.ok(estado.proximaTentativaEm > new Date());
  assert.equal(await espelho.solicitar(), false);
  assert.equal(chamadasExternas, 1);
});
