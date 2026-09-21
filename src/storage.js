(function (global) {
  const B = global.Budget || (global.Budget = {});
  const { FIELDS, NUMERIC_FIELDS, toNumber, computeDerived } = B;
  const COLUMNS = B.COLUMNS;

  const STORAGE_KEY = 'budget.operations';

  function loadOperations() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveOperations(rows) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }

  function normalizeRecord(values) {
    const record = {};
    FIELDS.forEach((field, i) => {
      const raw = values[i];
      if (raw !== null && raw !== undefined && raw !== '') {
        record[field] = NUMERIC_FIELDS.has(field) ? toNumber(raw) : String(raw).trim();
      }
    });
    return record;
  }

  function detectSeparator(text) {
    const firstLine = text.split(/\r?\n/)[0] || '';
    return (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  }

  function parseCsv(text) {
    const separator = detectSeparator(text);
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === separator) {
        row.push(field); field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some((v) => v !== '')) rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    row.push(field);
    if (row.some((v) => v !== '')) rows.push(row);
    return rows;
  }

  function toCsv(rows) {
    const escape = (v) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /["\n,;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = [COLUMNS.map(escape).join(';')];
    for (const row of rows) {
      const derived = computeDerived(row);
      lines.push(FIELDS.map((f) => escape(derived[f])).join(';'));
    }
    return lines.join('\r\n') + '\r\n';
  }

  function importRows(records) {
    const existing = loadOperations();
    const key = (r) => `${r.code_operation || ''}|${r.sdg || ''}|${r.type_achat || ''}`;
    const byKey = new Map(existing.map((r) => [key(r), r]));
    for (const record of records) {
      byKey.set(key(record), { ...byKey.get(key(record)), ...record });
    }
    const merged = [...byKey.values()];
    saveOperations(merged);
    return merged.length;
  }

  function clearOperations() {
    localStorage.removeItem(STORAGE_KEY);
  }

  Object.assign(B, { loadOperations, saveOperations, normalizeRecord, parseCsv, toCsv, importRows, clearOperations });

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
