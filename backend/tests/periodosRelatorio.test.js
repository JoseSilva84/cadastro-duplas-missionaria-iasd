const test = require('node:test');
const assert = require('node:assert/strict');
const { inicioSemanaDomingoISO } = require('../src/utils/periodosRelatorio');

test('agrupa qualquer dia entre domingo e sábado no domingo inicial', () => {
  assert.equal(inicioSemanaDomingoISO('2026-11-08T00:00:00.000Z'), '2026-11-08');
  assert.equal(inicioSemanaDomingoISO('2026-11-10T00:00:00.000Z'), '2026-11-08');
  assert.equal(inicioSemanaDomingoISO('2026-11-14T23:59:59.000Z'), '2026-11-08');
  assert.equal(inicioSemanaDomingoISO('2026-11-15T00:00:00.000Z'), '2026-11-15');
});
