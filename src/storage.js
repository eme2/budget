(function (global) {
  const B = global.Budget || (global.Budget = {});
  const { OPERATION_FIELDS, NUMERIC_FIELDS, toNumber, computeDerived } = B;

  const KEYS = {
    operations: 'budget.operations',
    sdg: 'budget.sdg',
    depenses: 'budget.depenses',
  };

  function loadJson(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function loadOperations() { return loadJson(KEYS.operations); }
  function saveOperations(rows) { localStorage.setItem(KEYS.operations, JSON.stringify(rows)); }
  function loadSdg() { return loadJson(KEYS.sdg); }
  function saveSdg(rows) { localStorage.setItem(KEYS.sdg, JSON.stringify(rows)); }
  function loadDepenses() { return loadJson(KEYS.depenses); }
  function saveDepenses(rows) { localStorage.setItem(KEYS.depenses, JSON.stringify(rows)); }

  function normalizeOperation(values) {
    const record = {};
    OPERATION_FIELDS.forEach((field, i) => {
      const raw = values[i];
      if (raw !== null && raw !== undefined && raw !== '') {
        record[field] = NUMERIC_FIELDS.has(field) ? toNumber(raw) : String(raw).trim();
      }
    });
    if (record.code_operation) record.code_operation = normalizeCode(record.code_operation);
    return record;
  }

  function normalizeCode(code) {
    const m = String(code).match(/(\d{4})\s*[-/]\s*(\d+)/);
    return m ? `${m[1]}-${m[2]}` : String(code).trim();
  }

  function normalizeSdgRow(values, header) {
    const get = (names) => {
      for (const n of names) {
        const i = header.findIndex((h) => h.toLowerCase().includes(n));
        if (i !== -1 && values[i] !== '' && values[i] !== undefined) return values[i];
      }
      return '';
    };
    const type = inferSdgType(get(['type', 'nature']));
    return {
      sdg: String(get(['sdg', 'code'])).trim(),
      libelle: String(get(['libell', 'label', 'intitul']) ?? '').trim(),
      type,
      ligne_budgetaire: String(get(['ligne', 'budgetaire', 'imputation']) ?? '').trim(),
    };
  }

  function inferSdgType(raw) {
    if (!raw) return '';
    const s = String(raw).toLowerCase();
    if (s.startsWith('fonct') || s === 'f' || s.includes('courant')) return 'Fonctionnement';
    if (s.startsWith('invest') || s === 'i' || s.includes('capital') || s.includes('immobilis')) return 'Investissement';
    return String(raw).trim();
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

  function escapeCsv(v) {
    const s = v === null || v === undefined ? '' : String(v);
    return /["\n,;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(columns, fields, rows) {
    const lines = [columns.map(escapeCsv).join(';')];
    for (const row of rows) {
      const derived = computeDerived(row);
      lines.push(fields.map((f) => escapeCsv(derived[f])).join(';'));
    }
    return lines.join('\r\n') + '\r\n';
  }

  function toOperationsCsv(rows) {
    return toCsv(B.OPERATION_COLUMNS, B.OPERATION_FIELDS, rows);
  }

  function toSdgCsv(rows) {
    return toCsv(B.SDG_COLUMNS, B.SDG_FIELDS, rows);
  }

  function importOperations(records) {
    const existing = loadOperations();
    const key = (r) => `${r.code_operation || ''}|${r.sdg || ''}|${r.sous_type || ''}`;
    const byKey = new Map(existing.map((r) => [key(r), r]));
    for (const record of records) {
      byKey.set(key(record), { ...byKey.get(key(record)), ...record });
    }
    const merged = [...byKey.values()];
    saveOperations(merged);
    return merged.length;
  }

  function importSdg(records) {
    const existing = loadSdg();
    const bySdg = new Map(existing.map((r) => [r.sdg, r]));
    for (const record of records) {
      bySdg.set(record.sdg, { ...bySdg.get(record.sdg), ...record });
    }
    const merged = [...bySdg.values()];
    saveSdg(merged);
    return merged.length;
  }

  function clearOperations() { localStorage.removeItem(KEYS.operations); }
  function clearSdg() { localStorage.removeItem(KEYS.sdg); }
  function clearDepenses() { localStorage.removeItem(KEYS.depenses); }

  Object.assign(B, {
    KEYS, loadOperations, saveOperations, loadSdg, saveSdg, loadDepenses, saveDepenses,
    normalizeOperation, normalizeCode, normalizeSdgRow, inferSdgType,
    parseCsv, escapeCsv, toCsv, toOperationsCsv, toSdgCsv,
    importOperations, importSdg, clearOperations, clearSdg, clearDepenses,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
