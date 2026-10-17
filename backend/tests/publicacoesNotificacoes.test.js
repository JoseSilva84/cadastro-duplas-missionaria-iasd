const test = require('node:test');
const assert = require('node:assert/strict');
const { escopoDoAutor, filtroDestinatarios } = require('../src/services/publicacoesNotificacoes.service');

test('somente perfis autorizados recebem o alcance de sua função', () => {
  assert.deepEqual(escopoDoAutor({ perfil: 'SUPER_ADMIN' }), { escopo: 'TODOS', regiaoId: null, distritoId: null });
  assert.deepEqual(escopoDoAutor({ perfil: 'ADMINISTRADOR' }), { escopo: 'TODOS', regiaoId: null, distritoId: null });
  assert.deepEqual(escopoDoAutor({ perfil: 'PASTOR_REGIONAL', regiaoId: 7 }), { escopo: 'REGIAO', regiaoId: 7, distritoId: null });
  assert.deepEqual(escopoDoAutor({ perfil: 'COORDENADOR_REGIONAL', regiaoId: 7 }), { escopo: 'REGIAO', regiaoId: 7, distritoId: null });
  assert.deepEqual(escopoDoAutor({ perfil: 'PASTOR_DISTRITAL', distritoId: 11 }), { escopo: 'DISTRITO', regiaoId: null, distritoId: 11 });
  assert.equal(escopoDoAutor({ perfil: 'PASTOR_DISTRITAL' }), null);
  assert.equal(escopoDoAutor({ perfil: 'DUPLA_MISSIONARIA', distritoId: 11 }), null);
});

test('alcance inclui usuários vinculados por igreja ou dupla e exige vínculo válido', () => {
  const regional = filtroDestinatarios({ escopo: 'REGIAO', regiaoId: 7 });
  assert.equal(regional.ativo, true);
  assert.deepEqual(regional.OR, [
    { regiaoId: 7 },
    { distrito: { is: { regiaoId: 7 } } },
    { igreja: { is: { distrito: { is: { regiaoId: 7 } } } } },
    { dupla: { is: { distrito: { is: { regiaoId: 7 } } } } },
  ]);
  const distrital = filtroDestinatarios({ escopo: 'DISTRITO', distritoId: 11 });
  assert.equal(distrital.ativo, true);
  assert.deepEqual(distrital.OR, [
    { distritoId: 11 },
    { igreja: { is: { distritoId: 11 } } },
    { dupla: { is: { distritoId: 11 } } },
  ]);
  assert.throws(() => filtroDestinatarios({ escopo: 'REGIAO' }), /abrangência válida/);
});
