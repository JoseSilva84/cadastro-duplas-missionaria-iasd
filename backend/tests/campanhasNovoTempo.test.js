const test = require('node:test');
const assert = require('node:assert/strict');
const criarServico = require('../src/services/campanhasNovoTempo.service');

const usuarioDistrital = { perfil: 'PASTOR_DISTRITAL', distritoId: 42 };
const campanha = { id: 'primeira', nome: 'Campanha Região 6', dadosResumo: { totalOrigem: 1 } };

function banco(conversa = {}) {
  const consultas = [];
  return {
    consultas,
    sincronizacaoCampanhasNovoTempo: {
      findUnique: async () => ({ loteAtivo: 'lote-1', status: 'PRONTO' }),
    },
    campanhaNovoTempo: {
      findUnique: async () => campanha,
    },
    conversaCampanhaNovoTempo: {
      count: async ({ where }) => { consultas.push(where); return 1; },
      findMany: async ({ where }) => { consultas.push(where); return []; },
      findFirst: async ({ where }) => { consultas.push(where); return conversa.id ? conversa : null; },
      update: async () => {},
    },
  };
}

test('identifica aceite e território sem inventar dados do contato', () => {
  const servico = criarServico({ db: banco(), requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  const item = {
    id: 'conv-1', leadName: 'Maria', district: 'JD. SILVANIA', phone: '11999999999',
    delivery: { accepted: true, address: 'Rua A, 10' }, classification: { label: 'Brinde confirmado' },
  };
  const linha = servico._internals.linhaDaConversa(item, 'primeira', 'lote-1', { id: 42, regiaoId: 6, nome: 'JD. SILVANIA' });
  assert.equal(linha.regiaoId, 6);
  assert.equal(linha.distritoId, 42);
  assert.equal(linha.aceitou, true);
  assert.equal(linha.nome, 'Maria');
  assert.equal(linha.endereco, 'Rua A, 10');
});

test('une os aceites ao histórico sem duplicar a mesma conversa', () => {
  const servico = criarServico({ db: banco(), requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  const itens = servico._internals.conversasDaResposta({
    conversations: [{ id: 'conv-1', district: 'CARAPICUÍBA', leadName: 'Maria' }],
    acceptedConversations: [{ id: 'conv-1', delivery: { accepted: true, address: 'Rua A, 10' } }],
  });
  assert.equal(itens.length, 1);
  assert.equal(itens[0].district, 'CARAPICUÍBA');
  assert.equal(itens[0].leadName, 'Maria');
  assert.equal(itens[0].aceitouRelatorio, true);
});

test('um usuário distrital não consegue mudar o distrito pelo filtro', async () => {
  const db = banco();
  const servico = criarServico({ db, requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  await assert.rejects(servico.conversas(usuarioDistrital, 'primeira', { distritoId: '43' }), { status: 404 });
  assert.ok(db.consultas.every((where) => where.distritoId === 42));
  await servico.conversas(usuarioDistrital, 'primeira', { distritoId: '42' });
  assert.ok(db.consultas.every((where) => where.distritoId === 42));
});

test('a conversa é buscada na origem apenas após a autorização territorial', async () => {
  let chamadas = 0;
  const db = banco({
    id: 'hash-1', nome: 'Maria', distrito: 'JD. SILVANIA', telefone: '11999999999',
    aceitou: true, dados: { id: 'conv-1', lastLeadMessage: 'Aceito' },
  });
  const servico = criarServico({
    db, configuracao: () => ({}), possuiCredencial: () => true,
    requisitar: async (caminho) => {
      chamadas += 1;
      assert.match(caminho, /id=conv-1/);
      return { conversations: [{ id: 'conv-1', messages: [{ id: 'm1', body: 'Aceito', direction: 'INBOUND' }] }] };
    },
  });
  const detalhe = await servico.detalhe(usuarioDistrital, 'primeira', 'hash-1');
  assert.equal(chamadas, 1);
  assert.equal(detalhe.mensagens[0].texto, 'Aceito');
  assert.equal(detalhe.historicoCompleto, true);
  assert.ok(db.consultas.every((where) => where.distritoId === 42));
});

test('região sem campanha não recebe metadados nem conversas', async () => {
  const db = banco();
  db.conversaCampanhaNovoTempo.count = async ({ where }) => {
    assert.equal(where.regiaoId, 7);
    return 0;
  };
  const servico = criarServico({ db, requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  await assert.rejects(servico.resumo({ perfil: 'PASTOR_REGIONAL', regiaoId: 7 }, 'primeira'), { status: 404 });
});
