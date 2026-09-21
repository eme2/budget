import { COLUMNS, FIELDS, NUMERIC_FIELDS, computeDerived } from './schema.js';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
const THIN_BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

export async function readXlsx(filePath, { sheetName = 'Budget' } = {}) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.getWorksheet(sheetName) ?? workbook.worksheets[0];
  if (!ws) throw new Error(`Aucune feuille trouvée dans ${filePath}`);
  return { workbook, ws };
}

export async function generateTemplate(filePath) {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('Budget');

  ws.columns = COLUMNS.map((header) => ({
    header,
    width: Math.max(14, Math.min(28, header.length + 4)),
  }));

  const headerRow = ws.getRow(1);
  headerRow.height = 45;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = THIN_BORDER;
  });

  const col = (name) => COLUMNS.indexOf(name) + 1;
  const L = (name) => {
    const n = col(name);
    return String.fromCharCode(64 + n);
  };

  for (let row = 2; row <= 501; row++) {
    const reste = ws.getCell(row, col('Reste à engager'));
    reste.value = { formula: `IF(${L('Budget validé A (acquisitions)')}${row}="","",${L('Budget validé A (acquisitions)')}${row}-${L('Engagé (sans compter le RAR)')}${row})` };
    const besoins = ws.getCell(row, col('Besoins + ou -'));
    besoins.value = { formula: `IF(${L('Qtés validées A (à acquérir)')}${row}="","",${L('Qtés validées A (à acquérir)')}${row}-${L('Nb Acquis')}${row})` };
  }

  ws.views = [{ state: 'frozen', ySplit: 1, xSplit: 2 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

export function rowsFromWorksheet(ws) {
  const header = ws.getRow(1).values.slice(1);
  const rows = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values.slice(1);
    if (values.every((v) => v === null || v === undefined || v === '')) return;
    const record = {};
    FIELDS.forEach((field, i) => {
      const raw = values[i];
      if (raw !== null && raw !== undefined && raw !== '') {
        record[field] = NUMERIC_FIELDS.has(field) ? Number(raw) : String(raw).trim();
      }
    });
    rows.push(record);
  });
  return rows;
}

export async function importXlsx(filePath, db, { sheetName = 'Budget' } = {}) {
  const { ws } = await readXlsx(filePath, { sheetName });
  const rows = rowsFromWorksheet(ws);
  const stmt = db.prepare(`
    INSERT INTO operations (${FIELDS.join(', ')})
    VALUES (${FIELDS.map(() => '?').join(', ')})
    ON CONFLICT (code_operation, sdg, type_achat) DO UPDATE SET
      ${FIELDS.filter((f) => f !== 'code_operation').map((f) => `${f} = excluded.${f}`).join(', ')}
  `);
  let count = 0;
  const tx = db.transaction((records) => {
    for (const record of records) {
      const derived = computeDerived(record);
      stmt.run(FIELDS.map((f) => derived[f] ?? null));
      count++;
    }
  });
  tx(rows);
  return count;
}

export async function exportXlsx(filePath, db) {
  const ExcelJS = (await import('exceljs')).default;
  const rows = db.prepare('SELECT * FROM operations ORDER BY code_operation').all();
  await generateTemplate(filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const ws = workbook.getWorksheet('Budget');
  rows.forEach((row, i) => {
    const derived = computeDerived(row);
    const excelRow = ws.getRow(i + 2);
    FIELDS.forEach((field, j) => {
      if (field === 'reste_a_engager' || field === 'besoins') return;
      excelRow.getCell(j + 1).value = derived[field] ?? null;
    });
  });
  await workbook.xlsx.writeFile(filePath);
  return rows.length;
}

export async function exportCsv(filePath, db) {
  const { createObjectCsvWriter } = await import('csv-writer');
  const rows = db.prepare('SELECT * FROM operations ORDER BY code_operation').all();
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: COLUMNS.map((header, i) => ({ id: FIELDS[i], title: header })),
    fieldDelimiter: ';',
    encoding: 'utf-8',
  });
  await csvWriter.writeRecords(rows);
  return rows.length;
}
