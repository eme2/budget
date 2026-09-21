import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/schema.js';

const { OPERATION_COLUMNS, OPERATION_FIELDS, NUMERIC_FIELDS, SDG_TYPES, computeDerived, emptyOperation, toNumber } = globalThis.Budget;

test('les colonnes d\'opération correspondent au modèle demandé', () => {
  assert.deepEqual(OPERATION_COLUMNS, [
    'Code opération',
    'SDG',
    'Libellé de la dépense',
    'Sous-type',
    'Budget prévu',
    'Dépense réalisée (engagée)',
    'Crédit restant',
    'Quantité prévue',
    'Quantité achetée',
    'Quantité restante',
  ]);
  assert.equal(OPERATION_FIELDS.length, 10);
});

test('les types de SDG sont fonctionnement et investissement', () => {
  assert.deepEqual(SDG_TYPES, ['Fonctionnement', 'Investissement']);
});

test('computeDerived calcule crédit restant et quantité restante', () => {
  const row = computeDerived({
    code_operation: '2025-12',
    sdg: '22',
    budget_prevu: 100000,
    depense_realisee: 60000,
    quantite_prevue: 5,
    quantite_achetee: 3,
  });
  assert.equal(row.credit_restant, 40000);
  assert.equal(row.quantite_restante, 2);
});

test('computeDerived laisse vide si données manquantes', () => {
  const row = computeDerived({ budget_prevu: 100 });
  assert.equal(row.credit_restant, undefined);
  assert.equal(row.quantite_restante, undefined);
});

test('toNumber gère les formats avec espaces, virgules', () => {
  assert.equal(toNumber('100000'), 100000);
  assert.equal(toNumber('1234,5'), 1234.5);
  assert.equal(toNumber('1 234'), 1234);
  assert.equal(toNumber('abc'), null);
  assert.equal(toNumber(''), null);
});

test('emptyOperation a tous les champs vides', () => {
  const row = emptyOperation();
  assert.equal(Object.keys(row).length, OPERATION_FIELDS.length);
  assert.ok(Object.values(row).every((v) => v === ''));
});
