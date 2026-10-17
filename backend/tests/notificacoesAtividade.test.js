const test = require('node:test');
const assert = require('node:assert/strict');
const { filtroLiderancas } = require('../src/services/notificacoesAtividade.service');
const { descreverMudancaEstudo } = require('../src/services/estudoBiblico.service');

test('o alcance segue a hierarquia geográfica sem alcançar outras regiões ou igrejas', () => {
  assert.deepEqual(filtroLiderancas({ regiaoId: 3, distritoId: 8, igrejaId: 21 }), {
    ativo: true,
    OR: [
      { perfil: { in: ['SUPER_ADMIN', 'ADMINISTRADOR'] } },
      { perfil: { in: ['PASTOR_REGIONAL', 'COORDENADOR_REGIONAL'] }, regiaoId: 3 },
      { perfil: 'PASTOR_DISTRITAL', distritoId: 8 },
      { perfil: 'DIRETOR_MISSIONARIO_IGREJA', igrejaId: 21 },
    ],
  });
  assert.equal(filtroLiderancas({ regiaoId: 3 }).OR.length, 2);
  assert.equal(filtroLiderancas({}).OR.length, 1);
});

test('avanço de lição, encerramento e batismo geram mensagens próprias', () => {
  const anterior = { nomeEstudante: 'Ana', licaoAtual: 8, encerrado: false, statusEstudo: 'EM_ANDAMENTO', participantes: [] };
  assert.deepEqual(descreverMudancaEstudo({ ...anterior, licaoAtual: 9 }, anterior), {
    titulo: 'Lição do estudo atualizada',
    mensagem: 'O estudo de Ana passou da lição 8 para a 9.',
  });
  assert.deepEqual(descreverMudancaEstudo({ ...anterior, encerrado: true, statusEstudo: 'ENCERRADO', motivoEncerramento: 'BATISMO' }, anterior), {
    titulo: 'Batismo registrado',
    mensagem: 'O estudo de Ana foi encerrado com batismo.',
  });
  assert.equal(descreverMudancaEstudo({ ...anterior }, anterior), null);
});
