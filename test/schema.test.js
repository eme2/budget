import test from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, FIELDS, NUMERIC_FIELDS, computeDerived, emptyRow, toNumber } from '../src/schema.js';

test('les 17 colonnes et champs sont alignés', () => {
  assert.equal(COLUMNS.length, 17);
  assert.equal(FIELDS.length, 17);
  assert.equal(NUMERIC_FIELDS.size, 10);
});

test('computeDerived calcule reste_a_engager et besoins', () => {
  const row = computeDerived({
    code_operation: 'OP-1',
    budget_valide_a: 100000,
    engage_hors_rar: 60000,
    qtes_validees_a: 5,
    nb_acquis: 3,
  });
  assert.equal(row.reste_a_engager, 40000);
  assert.equal(row.besoins, 2);
});

test('computeDerived laisse vide si données manquantes', () => {
  const row = computeDerived({ code_operation: 'OP-2', budget_valide_a: 100 });
  assert.equal(row.reste_a_engager, undefined);
});

test('toNumber gère les formats FR et EN', () => {
  assert.equal(toNumber('100000'), 100000);
  assert.equal(toNumber('1 234,5'.replace(' ', '')), 1234.5);
  assert.equal(toNumber('abc'), null);
  assert.equal(toNumber(''), null);
});

test('emptyRow a tous les champs vides', () => {
  const row = emptyRow();
  assert.equal(Object.keys(row).length, FIELDS.length);
  assert.ok(Object.values(row).every((v) => v === ''));
});
