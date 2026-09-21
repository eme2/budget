import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/schema.js';

const {
  OPERATION_COLUMNS, OPERATION_FIELDS, NUMERIC_FIELDS, SDG_TYPES, BUDGET_STEPS,
  computeDerived, emptyOperation, toNumber, normalizeCode, operationYear,
} = globalThis.Budget;

test('les colonnes incluent les étapes budgétaires et le commentaire', () => {
  assert.deepEqual(OPERATION_COLUMNS, [
    'Code opération',
    'SDG',
    'Libellé de la dépense',
    'Sous-type',
    'Budget principal',
    'Budget supplémentaire',
    'Décision modificative',
    'Budget prévu',
    'Dépense réalisée (engagée)',
    'Crédit restant',
    'Quantité prévue',
    'Quantité achetée',
    'Quantité restante',
    'Commentaire',
  ]);
  assert.equal(OPERATION_FIELDS.length, 14);
});

test('les étapes budgétaires sont ordonnées', () => {
  assert.deepEqual(BUDGET_STEPS, ['Budget principal', 'Budget supplémentaire', 'Décision modificative']);
});

test('les types de SDG sont fonctionnement et investissement', () => {
  assert.deepEqual(SDG_TYPES, ['Fonctionnement', 'Investissement']);
});

test('budget prévu = principal + supplémentaire + modificative', () => {
  const row = computeDerived({
    code_operation: '2025-12',
    sdg: '22',
    budget_principal: 100000,
    budget_supplementaire: 20000,
    decision_modificative: -5000,
    depense_realisee: 60000,
    quantite_prevue: 5,
    quantite_achetee: 3,
  });
  assert.equal(row.budget_prevu, 115000);
  assert.equal(row.credit_restant, 55000);
  assert.equal(row.quantite_restante, 2);
});

test('computeDerived gère les valeurs négatives et manquantes', () => {
  const row = computeDerived({ budget_principal: 100, decision_modificative: -30 });
  assert.equal(row.budget_prevu, 70);
  assert.equal(row.credit_restant, undefined);
  const empty = computeDerived({});
  assert.equal(empty.budget_prevu, undefined);
});

test('operationYear extrait l\'année du code opération', () => {
  assert.equal(operationYear('2025-12'), '2025');
  assert.equal(operationYear('OP-1'), '');
  assert.equal(normalizeCode('2025 - 12'), '2025-12');
});

test('toNumber gère les formats avec espaces, virgules', () => {
  assert.equal(toNumber('100000'), 100000);
  assert.equal(toNumber('1234,5'), 1234.5);
  assert.equal(toNumber('1 234'), 1234);
  assert.equal(toNumber('-5000'), -5000);
  assert.equal(toNumber('abc'), null);
});

test('emptyOperation a tous les champs vides', () => {
  const row = emptyOperation();
  assert.equal(Object.keys(row).length, OPERATION_FIELDS.length);
  assert.ok(Object.values(row).every((v) => v === ''));
});
