/**
 * Persistance et échanges de données.
 *
 * Le stockage est le localStorage du navigateur, découpé en trois espaces :
 *  - budget.operations : les opérations (toutes années confondues)
 *  - budget.sdg         : le référentiel SDG
 *  - budget.depenses   : réservé pour la liste détaillée des dépenses (à venir)
 *
 * Chaque fonction lit/écrit l'intégralité de sa collection : le volume de
 * données visé (quelques centaines de lignes) le permet largement et cela
 * évite toute désynchronisation entre l'interface et le stockage.
 */
(function (global) {
  const B = global.Budget || (global.Budget = {});
  const { OPERATION_FIELDS, NUMERIC_FIELDS, toNumber, computeDerived, normalizeCode } = B;

  const KEYS = {
    operations: 'budget.operations',
    sdg: 'budget.sdg',
    depenses: 'budget.depenses',
  };

  /** Lit une collection JSON ; toute donnée corrompue est traitée comme absente. */
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

  /**
   * Transforme une ligne CSV (tableau de valeurs, dans l'ordre des colonnes)
   * en enregistrement d'opération :
   *  - les champs numériques sont convertis (virgule décimale acceptée),
   *    les autres sont nettoyés des espaces superflus ;
   *  - les cellules vides ne sont pas stockées (absent = non renseigné) ;
   *  - le code opération est normalisé au format "année-numéro".
   */
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

  /**
   * Mappe une ligne de l'export de l'outil financier vers une SDG.
   * Les en-têtes de l'export varient selon les outils : la correspondance se
   * fait par mots-clés (ex : une colonne contenant "libell" fournit le
   * libellé, "imputation" la ligne budgétaire). Le type est déduit par
   * inferSdgType.
   */
  function normalizeSdgRow(values, header) {
    const get = (names) => {
      for (const n of names) {
        const i = header.findIndex((h) => h.toLowerCase().includes(n));
        if (i !== -1 && values[i] !== '' && values[i] !== undefined) return values[i];
      }
      return '';
    };
    return {
      sdg: String(get(['sdg', 'code'])).trim(),
      libelle: String(get(['libell', 'label', 'intitul']) ?? '').trim(),
      type: inferSdgType(get(['type', 'nature'])),
      ligne_budgetaire: String(get(['ligne', 'budgetaire', 'imputation']) ?? '').trim(),
    };
  }

  /**
   * Devine si une SDG relève du Fonctionnement ou de l'Investissement à
   * partir des libellés les plus courants des outils financiers
   * ("dépenses courantes", "F", "capital", "immobilisations"...).
   * Renvoie le libellé d'origine s'il n'est pas reconnu, chaîne vide sinon.
   */
  function inferSdgType(raw) {
    if (!raw) return '';
    const s = String(raw).toLowerCase();
    if (s.startsWith('fonct') || s === 'f' || s.includes('courant')) return 'Fonctionnement';
    if (s.startsWith('invest') || s === 'i' || s.includes('capital') || s.includes('immobilis')) return 'Investissement';
    return String(raw).trim();
  }

  /**
   * Analyseur CSV tolérant :
   *  - séparateur ';' ou ',' détecté sur la première ligne ;
   *  - guillemets gérés (valeur contenant le séparateur, guillemet doublé) ;
   *  - retours Windows/Unix normalisés ;
   *  - lignes entièrement vides ignorées.
   */
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

  /** Échappe une valeur pour le CSV (guillemets si séparateur, virgule ou saut de ligne). */
  function escapeCsv(v) {
    const s = v === null || v === undefined ? '' : String(v);
    return /["\n,;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  /** Sérialise des lignes en CSV ; les champs calculés sont recalculés avant. */
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

  /**
   * Import d'opérations avec fusion :
   * une ligne importée remplace la ligne existante de même clé
   * (code opération + SDG + sous-type) ; sinon elle est ajoutée.
   * Les champs absents de l'import ne sont pas perdus.
   */
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

  /** Import du référentiel SDG avec fusion par code SDG. */
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

  /**
   * Regroupe les opérations par année (extraite du code opération).
   * Les lignes sans année exploitable tombent dans la clé "".
   */
  function operationsByYear() {
    const byYear = new Map();
    for (const row of loadOperations()) {
      const year = B.operationYear(row.code_operation);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(row);
    }
    return byYear;
  }

  /** Années présentes dans les données, triées (utile pour les sélecteurs). */
  function knownYears() {
    return [...operationsByYear().keys()].filter(Boolean).sort();
  }

  /**
   * Crée l'année cible à partir de l'année source : les lignes sont
   * globalement identiques d'une année à l'autre, seuls les montants évoluent.
   * Recopiés : code (requalé sur l'année cible), SDG, libellé, sous-type.
   * Remis à zéro : budgets, dépense réalisée, quantités achetée/restante,
   * commentaire (l'historique de traçabilité ne doit pas migrer).
   * Les lignes déjà présentes dans l'année cible ne sont pas dupliquées.
   */
  function duplicateYear(sourceYear, targetYear, { copyBudgets = true } = {}) {
    const rows = loadOperations();
    const source = rows.filter((r) => B.operationYear(r.code_operation) === sourceYear);
    if (!source.length) throw new Error(`Aucune opération pour l'année ${sourceYear}`);
    const targetCode = (code) => {
      const num = code.split('-').slice(1).join('-');
      return `${targetYear}-${num}`;
    };
    const existing = new Set(
      rows.filter((r) => B.operationYear(r.code_operation) === targetYear)
        .map((r) => `${r.code_operation}|${r.sdg}|${r.sous_type}`),
    );
    const copies = source
      .filter((r) => !existing.has(`${targetCode(r.code_operation)}|${r.sdg}|${r.sous_type}`))
      .map((r) => ({
        ...r,
        code_operation: targetCode(r.code_operation),
        budget_principal: copyBudgets ? r.budget_principal : '',
        budget_supplementaire: copyBudgets ? r.budget_supplementaire : '',
        decision_modificative: copyBudgets ? r.decision_modificative : '',
        budget_prevu: copyBudgets ? r.budget_prevu : '',
        depense_realisee: '',
        credit_restant: '',
        quantite_prevue: copyBudgets ? r.quantite_prevue : '',
        quantite_achetee: '',
        quantite_restante: '',
        commentaire: '',
      }));
    if (!copies.length) throw new Error(`Les opérations ${targetYear} existent déjà`);
    saveOperations([...rows, ...copies]);
    return copies.length;
  }

  /**
   * Ajoute une entrée datée au commentaire d'une opération (traçabilité).
   * Format : "[AAAA-MM-JJ] texte". L'historique est cumulatif, une entrée
   * par ligne ; l'objet d'origine n'est pas modifié.
   */
  function appendComment(row, text) {
    const stamp = new Date().toISOString().slice(0, 10);
    const entry = `[${stamp}] ${text}`;
    return { ...row, commentaire: row.commentaire ? `${row.commentaire}\n${entry}` : entry };
  }

  function clearOperations() { localStorage.removeItem(KEYS.operations); }
  function clearSdg() { localStorage.removeItem(KEYS.sdg); }
  function clearDepenses() { localStorage.removeItem(KEYS.depenses); }

  Object.assign(B, {
    KEYS, loadOperations, saveOperations, loadSdg, saveSdg, loadDepenses, saveDepenses,
    normalizeOperation, normalizeSdgRow, inferSdgType,
    parseCsv, escapeCsv, toCsv, toOperationsCsv, toSdgCsv,
    importOperations, importSdg, operationsByYear, knownYears, duplicateYear, appendComment,
    clearOperations, clearSdg, clearDepenses,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
