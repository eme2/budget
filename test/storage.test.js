import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/schema.js';
import '../src/storage.js';

const { OPERATION_COLUMNS, SDG_COLUMNS } = globalThis.Budget;
const {
  parseCsv, toOperationsCsv, toSdgCsv, normalizeOperation, normalizeCode,
  normalizeSdgRow, inferSdgType, importOperations, importSdg,
  loadOperations, loadSdg, clearOperations, clearSdg,
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

test('parseCsv détecte la virgule comme séparateur', () => {
  setupStorage();
  const rows = parseCsv('a,b,c\n1,2,3');
  assert.deepEqual(rows, [['a', 'b', 'c'], ['1', '2', '3']]);
});

test('normalizeCode met en forme année-numéro', () => {
  assert.equal(normalizeCode('2025 - 12'), '2025-12');
  assert.equal(normalizeCode('2025/03'), '2025-03');
  assert.equal(normalizeCode('2025-07'), '2025-07');
  assert.equal(normalizeCode('OP-1'), 'OP-1');
});

test('normalizeOperation convertit les montants et quantités', () => {
  const r = normalizeOperation(['2025-12', '22', 'Serveurs', 'Extension', '100000', '60000', '', '5', '3', '']);
  assert.equal(r.code_operation, '2025-12');
  assert.equal(r.sdg, '22');
  assert.equal(r.budget_prevu, 100000);
  assert.equal(r.depense_realisee, 60000);
  assert.equal(r.quantite_prevue, 5);
  assert.equal(r.quantite_achetee, 3);
  assert.equal(r.credit_restant, undefined);
});

test('importOperations fusionne par clé', () => {
  setupStorage();
  clearOperations();
  const first = normalizeOperation(['2025-12', '22', 'Serveurs', 'Extension', '100000', '60000', '', '5', '3', '']);
  assert.equal(importOperations([first]), 1);
  const updated = normalizeOperation(['2025-12', '22', 'Serveurs v2', 'Extension', '120000', '70000', '', '5', '3', '']);
  assert.equal(importOperations([updated]), 1);
  const rows = loadOperations();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].libelle, 'Serveurs v2');
});

test('inferSdgType reconnaît les libellés courants', () => {
  assert.equal(inferSdgType('Fonctionnement'), 'Fonctionnement');
  assert.equal(inferSdgType('fonctionnement'), 'Fonctionnement');
  assert.equal(inferSdgType('Investissement'), 'Investissement');
  assert.equal(inferSdgType('investissements'), 'Investissement');
  assert.equal(inferSdgType('Dépenses courantes'), 'Fonctionnement');
  assert.equal(inferSdgType(''), '');
});

test('normalizeSdgRow mappe les en-têtes d\'export financier', () => {
  const header = ['Code SDG', 'Intitulé', 'Nature', 'Imputation budgétaire'];
  const r = normalizeSdgRow(['4490', 'Petits matériels', 'Investissement', '22'], header);
  assert.equal(r.sdg, '4490');
  assert.equal(r.libelle, 'Petits matériels');
  assert.equal(r.type, 'Investissement');
  assert.equal(r.ligne_budgetaire, '22');
});

test('importSdg fusionne par code SDG', () => {
  setupStorage();
  clearSdg();
  const first = normalizeSdgRow(['22', 'Fonctionnement général', 'F', ''], ['SDG', 'Libellé', 'Type', 'Ligne']);
  assert.equal(importSdg([first]), 1);
  const second = normalizeSdgRow(['4490', 'Matériels', 'Investissement', '22'], ['SDG', 'Libellé', 'Type', 'Ligne']);
  assert.equal(importSdg([first, second]), 2);
  const rows = loadSdg();
  assert.equal(rows.length, 2);
  assert.equal(rows[0].type, 'Fonctionnement');
});

test('toOperationsCsv round-trip avec en-têtes', () => {
  setupStorage();
  clearOperations();
  importOperations([normalizeOperation(['2025-12', '22', 'A;b', 'Extension', '100', '60', '', '5', '3', ''])]);
  const csv = toOperationsCsv(loadOperations());
  const parsed = parseCsv(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].length, OPERATION_COLUMNS.length);
  assert.equal(parsed[1][0], '2025-12');
  assert.equal(parsed[1][6], '40');
  assert.equal(parsed[1][9], '2');
  const back = normalizeOperation(parsed[1]);
  assert.equal(back.credit_restant, 40);
  assert.equal(back.quantite_restante, 2);
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
