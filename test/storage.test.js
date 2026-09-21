import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/schema.js';
import '../src/storage.js';

const { OPERATION_COLUMNS, SDG_COLUMNS, normalizeCode, computeDerived } = globalThis.Budget;
const {
  parseCsv, toOperationsCsv, toSdgCsv, normalizeOperation, normalizeSdgRow, inferSdgType,
  importOperations, importSdg, loadOperations, loadSdg,
  knownYears, operationsByYear, duplicateYear, appendComment,
  clearOperations, clearSdg,
} = globalThis.Budget;

function setupStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}

test('parseCsv gère séparateurs, guillemets et retours ligne', () => {
  setupStorage();
  const rows = parseCsv('a;b;c\r\n"x;y";2;3\r\n4;5;6');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['x;y', '2', '3'], ['4', '5', '6']]);
});

test('normalizeCode met en forme année-numéro', () => {
  assert.equal(normalizeCode('2025 - 12'), '2025-12');
  assert.equal(normalizeCode('2025/03'), '2025-03');
});

test('normalizeOperation convertit montants et quantités', () => {
  const r = normalizeOperation(['2025-12', '22', 'Serveurs', 'Extension', '100000', '20000', '-5000', '', '60000', '', '5', '3', '', '']);
  assert.equal(r.code_operation, '2025-12');
  assert.equal(r.budget_principal, 100000);
  assert.equal(r.budget_supplementaire, 20000);
  assert.equal(r.decision_modificative, -5000);
  assert.equal(r.depense_realisee, 60000);
  assert.equal(r.commentaire, undefined);
});

test('importOperations fusionne par clé et trace les mises à jour de fusion', () => {
  setupStorage();
  clearOperations();
  const first = normalizeOperation(['2025-12', '22', 'Serveurs', 'Extension', '100000', '', '', '', '', '', '', '', '', '']);
  assert.equal(importOperations([first]), 1);
  const updated = normalizeOperation(['2025-12', '22', 'Serveurs v2', 'Extension', '120000', '', '', '', '', '', '', '', '', '']);
  assert.equal(importOperations([updated]), 1);
  const rows = loadOperations();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].libelle, 'Serveurs v2');
  assert.equal(rows[0].budget_principal, 120000);
});

test('inferSdgType reconnaît les libellés courants', () => {
  assert.equal(inferSdgType('Fonctionnement'), 'Fonctionnement');
  assert.equal(inferSdgType('Investissement'), 'Investissement');
  assert.equal(inferSdgType('Dépenses courantes'), 'Fonctionnement');
  assert.equal(inferSdgType(''), '');
});

test('normalizeSdgRow mappe les en-têtes d\'export financier', () => {
  const header = ['Code SDG', 'Intitulé', 'Nature', 'Imputation budgétaire'];
  const r = normalizeSdgRow(['4490', 'Petits matériels', 'Investissement', '22'], header);
  assert.equal(r.sdg, '4490');
  assert.equal(r.type, 'Investissement');
});

test('knownYears et operationsByYear regroupent par année', () => {
  setupStorage();
  clearOperations();
  importOperations([
    normalizeOperation(['2024-01', '22', 'A', '', '10', '', '', '', '5', '', '', '', '', '']),
    normalizeOperation(['2025-01', '22', 'A', '', '20', '', '', '', '8', '', '', '', '', '']),
    normalizeOperation(['2025-02', '22', 'B', '', '30', '', '', '', '12', '', '', '', '', '']),
  ]);
  assert.deepEqual(knownYears(), ['2024', '2025']);
  assert.equal(operationsByYear().get('2025').length, 2);
  assert.equal(operationsByYear().get('2024').length, 1);
});

test('duplicateYear copie la structure sans les dépenses ni les commentaires', () => {
  setupStorage();
  clearOperations();
  importOperations([
    normalizeOperation(['2025-01', '22', 'Serveurs', 'Extension', '100000', '20000', '-5000', '', '60000', '', '5', '3', '', 'ancien commentaire']),
  ]);
  const count = duplicateYear('2025', '2026', { copyBudgets: false });
  assert.equal(count, 1);
  const rows = loadOperations();
  const copy = rows.find((r) => r.code_operation === '2026-01');
  assert.ok(copy);
  assert.equal(copy.sdg, '22');
  assert.equal(copy.libelle, 'Serveurs');
  assert.equal(copy.sous_type, 'Extension');
  assert.equal(copy.budget_principal, '');
  assert.equal(copy.depense_realisee, '');
  assert.equal(copy.quantite_achetee, '');
  assert.equal(copy.commentaire, '');
});

test('duplicateYear ne duplique pas les lignes déjà existantes', () => {
  setupStorage();
  clearOperations();
  importOperations([
    normalizeOperation(['2025-01', '22', 'A', '', '10', '', '', '', '', '', '', '', '', '']),
    normalizeOperation(['2026-01', '22', 'A', '', '20', '', '', '', '', '', '', '', '', '']),
  ]);
  assert.throws(() => duplicateYear('2025', '2026'), /existent déjà/);
});

test('appendComment ajoute une entrée datée et préserve l\'historique', () => {
  const row = { commentaire: '[2025-01-10] création' };
  const updated = appendComment(row, 'budget supplémentaire : +20000');
  assert.equal(updated.commentaire.split('\n').length, 2);
  assert.ok(updated.commentaire.includes('budget supplémentaire : +20000'));
  assert.equal(row.commentaire, '[2025-01-10] création');
});

test('toOperationsCsv round-trip avec en-têtes', () => {
  setupStorage();
  clearOperations();
  importOperations([normalizeOperation(['2025-12', '22', 'A;b', 'Extension', '100', '', '', '', '60', '', '5', '3', '', 'note'])]);
  const csv = toOperationsCsv(loadOperations());
  const parsed = parseCsv(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].length, OPERATION_COLUMNS.length);
  assert.equal(parsed[1][0], '2025-12');
  assert.equal(parsed[1][7], '100');
  assert.equal(parsed[1][9], '40');
  assert.equal(parsed[1][12], '2');
  assert.equal(parsed[1][13], 'note');
});

test('toSdgCsv exporte le référentiel', () => {
  setupStorage();
  clearSdg();
  importSdg([{ sdg: '22', libelle: 'Fonctionnement', type: 'Fonctionnement', ligne_budgetaire: '' }]);
  const csv = toSdgCsv(loadSdg());
  const parsed = parseCsv(csv);
  assert.equal(parsed[0].length, SDG_COLUMNS.length);
  assert.equal(parsed[1][0], '22');
});
