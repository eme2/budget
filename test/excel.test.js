import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { COLUMNS, FIELDS, NUMERIC_FIELDS, computeDerived } from '../src/schema.js';
import { generateTemplate, importXlsx, exportXlsx, exportCsv, rowsFromWorksheet } from '../src/excel.js';
import { openDb } from '../src/db.js';

test('les 16 colonnes et champs sont alignés', () => {
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

test('import puis export xlsx et csv round-trip', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'budget-'));
  const db = openDb(path.join(tmp, 'test.db'));

  const template = path.join(tmp, 'template.xlsx');
  await generateTemplate(template);
  assert.ok(fs.existsSync(template));

  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Budget');
  ws.addRow(COLUMNS);
  ws.addRow(['OP-001', 'Serveurs', 'DSI', 'Info', 100000, 120000, 5, 60000, null, null, 'ok', 2, 'ok', 3, 1, 'livré', 60000]);
  const input = path.join(tmp, 'input.xlsx');
  await wb.xlsx.writeFile(input);

  const count = await importXlsx(input, db);
  assert.equal(count, 1);

  const stored = db.prepare('SELECT * FROM operations').all();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].reste_a_engager, 40000);
  assert.equal(stored[0].besoins, 2);

  const outXlsx = path.join(tmp, 'out.xlsx');
  const exported = await exportXlsx(outXlsx, db);
  assert.equal(exported, 1);

  const outCsv = path.join(tmp, 'out.csv');
  await exportCsv(outCsv, db);
  const csv = fs.readFileSync(outCsv, 'utf-8');
  assert.ok(csv.includes('OP-001'));
  assert.ok(csv.includes('Reste à engager'));

  db.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});
