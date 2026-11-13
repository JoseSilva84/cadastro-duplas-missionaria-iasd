const test = require('node:test');
const assert = require('node:assert/strict');
const { inicioSemanaDomingoISO } = require('../src/utils/periodosRelatorio');

test('agrupa qualquer dia entre domingo e sábado no domingo inicial', () => {
  assert.equal(inicioSemanaDomingoISO('2026-11-08T00:00:00.000Z'), '2026-11-08');
  assert.equal(inicioSemanaDomingoISO('2026-11-10T00:00:00.000Z'), '2026-11-08');
  assert.equal(inicioSemanaDomingoISO('2026-11-14T23:59:59.000Z'), '2026-11-08');
  assert.equal(inicioSemanaDomingoISO('2026-11-15T00:00:00.000Z'), '2026-11-15');
});

test('gera quadrados de todas as semanas e meses do ano no frontend', async () => {
  const {
    listarSemanasDoAno,
    listarMesesDoAno,
    intervaloDaSemana,
    semanaISOParaData,
  } = await import('../../frontend/cadastro-missionario/src/lib/periodosRelatorio.js');

  const semanas2026 = listarSemanasDoAno(2026);
  assert.equal(semanas2026.length, 53);
  assert.equal(semanas2026[0].codigo, '2026-W01');
  assert.equal(semanas2026[45].codigo, '2026-W46');
  assert.equal(semanas2026[45].de, '2026-11-08');
  assert.equal(semanas2026[45].ate, '2026-11-14');
  assert.equal(semanas2026[45].intervaloCurto, '08/11–14/11');
  assert.equal(semanaISOParaData('2026-11-08'), '2026-W46');
  assert.deepEqual(intervaloDaSemana('2026-W46'), { de: '2026-11-08', ate: '2026-11-14' });

  const semanas2025 = listarSemanasDoAno(2025);
  assert.equal(semanas2025.length, 52);

  const meses2026 = listarMesesDoAno(2026);
  assert.equal(meses2026.length, 12);
  assert.equal(meses2026[10].codigo, '2026-11');
  assert.equal(meses2026[10].nomeCurto, 'Nov');
  assert.equal(meses2026[10].de, '2026-11-01');
  assert.equal(meses2026[10].ate, '2026-11-30');
});

