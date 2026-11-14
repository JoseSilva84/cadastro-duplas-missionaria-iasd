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
      groupBy: async ({ where }) => { consultas.push(where); return []; },
      update: async () => {},
    },
    igreja: {
      findUnique: async () => null,
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

test('descarta conversa livre no campo de endereço e mantém um endereço real', () => {
  const servico = criarServico({ db: banco(), requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  assert.equal(servico._internals.limparEndereco('Agradecemos seu contato. Como podemos ajudar?'), '');
  assert.equal(servico._internals.limparEndereco('Gostaria sim, amo estudar a palavra de Deus'), '');
  assert.equal(servico._internals.limparEndereco('meu endereço: Rua Lins de Vasconcelos, 590 CEP 06396-130'), 'Rua Lins de Vasconcelos, 590 CEP 06396-130');
  assert.equal(servico._internals.limparEndereco('CARAPICUÍBA - Parque Santa Teresa'), 'CARAPICUÍBA - Parque Santa Teresa');
});

test('usa o endereço cadastrado no Amigos NT quando a conversa não informou endereço válido', () => {
  const servico = criarServico({ db: banco(), requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  const item = {
    id: 'conv-2', leadName: 'Alex', district: 'CARAPICUÍBA',
    delivery: { accepted: true, address: 'Agradecemos seu contato. Como podemos ajudar?' },
    enderecoCadastroNovoTempo: 'Rua das Flores, 25 - Jardim Ariston',
  };
  const linha = servico._internals.linhaDaConversa(item, 'primeira', 'lote-1', { id: 42, regiaoId: 6, nome: 'CARAPICUÍBA' });
  assert.equal(linha.endereco, 'Rua das Flores, 25 - Jardim Ariston');
});

test('diretor missionário visualiza somente a igreja vinculada', async () => {
  const db = banco();
  db.igreja.findUnique = async () => ({ distritoId: 42, nome: 'Nova Ariston' });
  const servico = criarServico({ db, requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  const escopo = await servico._internals.escopoDoUsuario({ perfil: 'DIRETOR_MISSIONARIO_IGREJA', igrejaId: 9 }, db);
  assert.deepEqual(escopo, { distritoId: 42, igreja: 'Nova Ariston' });
});

test('localiza o endereço cadastrado pelo telefone do interessado, sem confundir homônimos', async () => {
  const db = banco();
  db.conversaCampanhaNovoTempo.findMany = async () => [{
    id: 'hash-2', nome: 'Maria Silva', distrito: 'CARAPICUÍBA', distritoId: 42,
    igreja: 'Nova Ariston', situacao: 'Brinde confirmado', aceitou: true,
    telefone: '11999990002', endereco: null, dados: {}, atualizadoEm: null,
  }];
  db.sincronizacaoNovoTempo = { findUnique: async () => ({ loteAtivo: 'leads-1' }) };
  db.interessadoNovoTempo = {
    findMany: async () => [
      { nome: 'Maria Silva', distritoChave: 'carapicuiba', dados: { whatsappNumero: '11999990001', endereco: 'Rua A, 10' } },
      { nome: 'Maria Silva', distritoChave: 'carapicuiba', dados: { whatsappNumero: '11999990002', endereco: 'Rua B, 20' } },
    ],
  };
  const servico = criarServico({ db, requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  const resultado = await servico.conversas(usuarioDistrital, 'primeira', {});
  assert.equal(resultado.itens[0].endereco, 'Rua B, 20');
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

test('calcula as 11 faixas de tempo até o aceite no resumo para escopo territorial e geral', async () => {
  const db = banco();
  db.conversaCampanhaNovoTempo.findMany = async () => [
    {
      distritoId: 42,
      distrito: 'JD. SILVANIA',
      igreja: 'Jd. Caprioti',
      situacao: 'Brinde confirmado',
      aceitou: true,
      atualizadoEm: new Date('2026-11-10T10:00:00Z'),
      dados: { delivery: { requestAgeBucket: '3-to-6-months', requestAgeDays: 120 }, leadMessageCount: 2 },
    },
    {
      distritoId: 42,
      distrito: 'JD. SILVANIA',
      igreja: 'Nova Ariston',
      situacao: 'Brinde confirmado',
      aceitou: true,
      atualizadoEm: new Date('2026-11-10T10:00:00Z'),
      dados: { delivery: { requestAgeDays: 20 }, leadMessageCount: 1 },
    },
  ];
  const servico = criarServico({ db, requisitar: async () => {}, configuracao: () => ({}), possuiCredencial: () => true });
  const resultado = await servico.resumo(usuarioDistrital, 'primeira');
  assert.equal(resultado.faixasTempo.length, 11);
  const faixa8a30 = resultado.faixasTempo.find((f) => f.id === '8-to-30-days');
  const faixa3a6m = resultado.faixasTempo.find((f) => f.id === '3-to-6-months');
  assert.equal(faixa8a30.count, 1);
  assert.equal(faixa8a30.percentage, 50);
  assert.equal(faixa3a6m.count, 1);
  assert.equal(faixa3a6m.percentage, 50);
  assert.equal(resultado.faixasTempoPorIgreja['42|Jd. Caprioti'].find((f) => f.id === '3-to-6-months').count, 1);
});

