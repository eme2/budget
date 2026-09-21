import test from 'node:test';
import assert from 'node:assert/strict';
import { COLUMNS, FIELDS } from '../src/schema.js';
import { parseCsv, toCsv, normalizeRecord, importRows, exportRows, loadOperations, saveOperations, clearOperations } from '../src/storage.js';

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

test('importRows fusionne par clé et met à jour', () => {
  setupStorage();
  clearOperations();
  const first = normalizeRecord(['OP-1', 'Serveurs', 'DSI', 'Info', '100000', '', '5', '60000', '', '', 'ok', '', '', '3', '', '', '']);
  assert.equal(importRows([first]), 1);
  const updated = normalizeRecord(['OP-1', 'Serveurs v2', 'DSI', 'Info', '120000', '', '5', '70000', '', '', 'ok', '', '', '3', '', '', '']);
  assert.equal(importRows([updated]), 1);
  const rows = loadOperations();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].libelle_operation, 'Serveurs v2');
  assert.equal(rows[0].budget_valide_a, 120000);
});

test('toCsv + parseCsv round-trip avec en-têtes', () => {
  setupStorage();
  clearOperations();
  importRows([normalizeRecord(['OP-1', 'A;b', 'DSI', 'Info', '100', '120', '5', '60', '', '', 'c', '2', 'ok', '3', '1', 'livré', '60'])]);
  const csv = toCsv(exportRows());
  const parsed = parseCsv(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].length, COLUMNS.length);
  assert.equal(parsed[1][0], 'OP-1');
  assert.equal(parsed[1][8], '40');
  assert.equal(parsed[1][9], '2');
  const back = normalizeRecord(parsed[1]);
  assert.equal(back.reste_a_engager, 40);
  assert.equal(back.besoins, 2);
});

test('clearOperations vide le stockage', () => {
  setupStorage();
  importRows([normalizeRecord(['OP-2', 'x', 'y', 'z', '1', '', '', '', '', '', '', '', '', '', '', '', ''])]);
  clearOperations();
  assert.equal(loadOperations().length, 0);
});
