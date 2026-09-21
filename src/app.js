const {
  OPERATION_COLUMNS, OPERATION_FIELDS, NUMERIC_FIELDS, SDG_COLUMNS, SDG_FIELDS, SDG_TYPES, BUDGET_STEPS,
  computeDerived, emptyOperation, operationYear,
} = window.Budget;
const {
  loadOperations, saveOperations, loadSdg, saveSdg,
  normalizeOperation, normalizeSdgRow, parseCsv, toOperationsCsv, toSdgCsv,
  importOperations, importSdg, knownYears, duplicateYear, appendComment,
  clearOperations, clearSdg,
} = window.Budget;

const msg = document.getElementById('msg');
const isComputed = (f) => f === 'credit_restant' || f === 'quantite_restante' || f === 'budget_prevu';

function notify(text) {
  msg.textContent = text;
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

function download(filename, csv) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function setTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
  if (name === 'comparaison') renderComparison();
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
});

function renderTable(headEl, bodyEl, footEl, columns, fields, rows, renderRow, sumFields) {
  headEl.innerHTML = '';
  columns.forEach((name) => {
    const th = document.createElement('th');
    th.textContent = name;
    th.title = name;
    headEl.appendChild(th);
  });
  const sums = {};
  bodyEl.innerHTML = '';
  rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    renderRow(tr, row, rowIndex);
    for (const [field, value] of Object.entries(tr.dataset.sums || {})) {
      sums[field] = (sums[field] || 0) + Number(value || 0);
    }
    bodyEl.appendChild(tr);
  });
  if (footEl) {
    footEl.innerHTML = '';
    fields.forEach((field) => {
      const td = document.createElement('td');
      if (sumFields.has(field)) td.textContent = sums[field] ? sums[field].toLocaleString('fr-FR') : '';
      footEl.appendChild(td);
    });
  }
  return sums;
}

function renderOperations() {
  const rows = loadOperations();
  const sums = renderTable(
    document.getElementById('op-head'),
    document.getElementById('op-body'),
    document.getElementById('op-foot'),
    OPERATION_COLUMNS, OPERATION_FIELDS, rows,
    (tr, row, rowIndex) => {
      const derived = computeDerived(row);
      const trSums = {};
      OPERATION_FIELDS.forEach((field) => {
        const td = document.createElement('td');
        if (isComputed(field)) {
          td.className = 'computed';
          td.textContent = derived[field] ?? '';
          trSums[field] = derived[field] ?? 0;
        } else if (field === 'sdg') {
          td.className = 'sdg';
          td.textContent = row[field] ?? '';
        } else if (field === 'commentaire') {
          td.className = 'commentaire';
          const text = document.createElement('textarea');
          text.value = row[field] ?? '';
          text.rows = 1;
          text.addEventListener('change', () => {
            const rows = loadOperations();
            rows[rowIndex][field] = text.value;
            saveOperations(rows);
            render();
          });
          td.appendChild(text);
        } else {
          if (NUMERIC_FIELDS.has(field)) td.className = 'numeric';
          const input = document.createElement('input');
          input.value = row[field] ?? '';
          input.addEventListener('change', () => {
            const rows = loadOperations();
            const previous = computeDerived(rows[rowIndex]);
            rows[rowIndex][field] = input.value;
            const next = computeDerived(rows[rowIndex]);
            const changes = [];
            if (BUDGET_STEPS.includes(OPERATION_COLUMNS[OPERATION_FIELDS.indexOf(field)]) ||
                ['depense_realisee', 'quantite_prevue', 'quantite_achetee'].includes(field)) {
              for (const f of ['budget_prevu', 'depense_realisee', 'quantite_prevue', 'quantite_achetee']) {
                if (String(previous[f] ?? '') !== String(next[f] ?? '')) {
                  changes.push(`${f} : ${previous[f] ?? '—'} → ${next[f] ?? '—'}`);
                }
              }
            }
            if (changes.length) {
              rows[rowIndex] = appendComment(rows[rowIndex], changes.join(' ; '));
            }
            saveOperations(rows);
            render();
          });
          td.appendChild(input);
        }
        tr.appendChild(td);
      });
      tr.dataset.sums = trSums;
      const tdAction = document.createElement('td');
      tdAction.className = 'rowactions';
      const del = document.createElement('button');
      del.textContent = '✕';
      del.title = 'Supprimer la ligne';
      del.addEventListener('click', () => {
        const rows = loadOperations();
        rows.splice(rowIndex, 1);
        saveOperations(rows);
        render();
      });
      tdAction.appendChild(del);
      tr.appendChild(tdAction);
    },
    NUMERIC_FIELDS,
  );
  const nb = rows.length;
  document.getElementById('op-totals').textContent =
    nb + (nb > 1 ? ' opérations' : ' opération') +
    ' — Budget prévu total : ' + (sums.budget_prevu || 0).toLocaleString('fr-FR') +
    ' — Crédit restant total : ' + (sums.credit_restant || 0).toLocaleString('fr-FR');
}

function renderSdg() {
  const rows = loadSdg();
  const sdgTypes = new Map(SDG_TYPES.map((t) => [t, 0]));
  renderTable(
    document.getElementById('sdg-head'),
    document.getElementById('sdg-body'),
    null,
    SDG_COLUMNS, SDG_FIELDS, rows,
    (tr, row, rowIndex) => {
      SDG_FIELDS.forEach((field) => {
        const td = document.createElement('td');
        if (field === 'type') {
          const select = document.createElement('select');
          const empty = document.createElement('option');
          empty.value = ''; empty.textContent = '—';
          select.appendChild(empty);
          SDG_TYPES.forEach((t) => {
            const opt = document.createElement('option');
            opt.value = t; opt.textContent = t;
            select.appendChild(opt);
          });
          select.value = row[field] ?? '';
          select.addEventListener('change', () => {
            const rows = loadSdg();
            rows[rowIndex].type = select.value;
            saveSdg(rows);
            render();
          });
          td.appendChild(select);
        } else {
          const input = document.createElement('input');
          input.value = row[field] ?? '';
          input.addEventListener('change', () => {
            const rows = loadSdg();
            rows[rowIndex][field] = input.value;
            saveSdg(rows);
            render();
          });
          td.appendChild(input);
        }
        tr.appendChild(td);
      });
      if (row.type) sdgTypes.set(row.type, (sdgTypes.get(row.type) || 0) + 1);
      const tdAction = document.createElement('td');
      tdAction.className = 'rowactions';
      const del = document.createElement('button');
      del.textContent = '✕';
      del.title = 'Supprimer la ligne';
      del.addEventListener('click', () => {
        const rows = loadSdg();
        rows.splice(rowIndex, 1);
        saveSdg(rows);
        render();
      });
      tdAction.appendChild(del);
      tr.appendChild(tdAction);
    },
    new Set(),
  );
  const nb = rows.length;
  document.getElementById('sdg-totals').textContent =
    nb + ' SDG' +
    ' — Fonctionnement : ' + (sdgTypes.get('Fonctionnement') || 0) +
    ', Investissement : ' + (sdgTypes.get('Investissement') || 0);
}

function renderComparison() {
  const years = knownYears();
  const selA = document.getElementById('cmp-year-a');
  const selB = document.getElementById('cmp-year-b');
  const keepA = selA.value, keepB = selB.value;
  [selA, selB].forEach((sel) => { sel.innerHTML = ''; });
  years.forEach((y) => {
    [selA, selB].forEach((sel) => {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      sel.appendChild(opt);
    });
  });
  if (years.includes(keepA)) selA.value = keepA;
  if (years.includes(keepB)) selB.value = keepB;
  else if (years.length > 1) selB.value = years[years.length - 1];

  const yearA = selA.value, yearB = selB.value;
  const rowsA = loadOperations().filter((r) => operationYear(r.code_operation) === yearA);
  const rowsB = loadOperations().filter((r) => operationYear(r.code_operation) === yearB);
  const key = (r) => `${r.code_operation.split('-').slice(1).join('-')}|${r.sdg}|${r.sous_type}`;
  const byKeyA = new Map(rowsA.map((r) => [key(r), r]));
  const byKeyB = new Map(rowsB.map((r) => [key(r), r]));
  const allKeys = [...new Set([...byKeyA.keys(), ...byKeyB.keys()])].sort();

  const columns = ['Code opération', 'SDG', 'Libellé', 'Sous-type',
    `Budget prévu ${yearA}`, `Budget prévu ${yearB}`, 'Écart budget',
    `Dépense réalisée ${yearA}`, `Dépense réalisée ${yearB}`, 'Écart dépense'];
  const headEl = document.getElementById('cmp-head');
  const bodyEl = document.getElementById('cmp-body');
  headEl.innerHTML = '';
  columns.forEach((name) => {
    const th = document.createElement('th');
    th.textContent = name;
    headEl.appendChild(th);
  });
  bodyEl.innerHTML = '';
  const tot = { ecartBudget: 0, ecartDepense: 0 };
  allKeys.forEach((k) => {
    const a = byKeyA.get(k), b = byKeyB.get(k);
    const da = a ? computeDerived(a) : {};
    const db = b ? computeDerived(b) : {};
    const budgetA = da.budget_prevu ?? 0, budgetB = db.budget_prevu ?? 0;
    const depA = da.depense_realisee ?? 0, depB = db.depense_realisee ?? 0;
    const ecartBudget = budgetB - budgetA;
    const ecartDepense = depB - depA;
    tot.ecartBudget += ecartBudget;
    tot.ecartDepense += ecartDepense;
    const tr = document.createElement('tr');
    const cells = [
      (b ?? a).code_operation, (b ?? a).sdg, (b ?? a).libelle ?? '', (b ?? a).sous_type ?? '',
      budgetA || '', budgetB || '', ecartBudget, depA || '', depB || '', ecartDepense,
    ];
    cells.forEach((v, i) => {
      const td = document.createElement('td');
      if (i >= 4) { td.className = 'numeric'; td.textContent = typeof v === 'number' ? v.toLocaleString('fr-FR') : v; }
      else td.textContent = v ?? '';
      if (i === 6 || i === 9) {
        if (v > 0) td.classList.add('ecart-plus');
        else if (v < 0) td.classList.add('ecart-moins');
      }
      tr.appendChild(td);
    });
    bodyEl.appendChild(tr);
  });
  const footEl = document.getElementById('cmp-foot');
  footEl.innerHTML = '';
  columns.forEach((name, i) => {
    const td = document.createElement('td');
    if (i === 6) td.textContent = tot.ecartBudget.toLocaleString('fr-FR');
    if (i === 9) td.textContent = tot.ecartDepense.toLocaleString('fr-FR');
    footEl.appendChild(td);
  });
  document.getElementById('cmp-totals').textContent =
    allKeys.length + ' lignes comparées entre ' + (yearA || '—') + ' et ' + (yearB || '—');
}

function render() {
  renderOperations();
  renderSdg();
  renderComparison();
}

document.getElementById('add-op').addEventListener('click', () => {
  const rows = loadOperations();
  rows.push(emptyOperation());
  saveOperations(rows);
  setTab('operations');
});

document.getElementById('clear-ops').addEventListener('click', () => {
  if (loadOperations().length === 0 || confirm('Effacer toutes les opérations du stockage du navigateur ?')) {
    clearOperations();
    render();
  }
});

document.getElementById('clear-sdg').addEventListener('click', () => {
  if (loadSdg().length === 0 || confirm('Effacer le référentiel SDG du stockage du navigateur ?')) {
    clearSdg();
    render();
  }
});

document.getElementById('export-ops').addEventListener('click', () => {
  download('operations.csv', toOperationsCsv(loadOperations()));
  notify('Export CSV téléchargé');
});

document.getElementById('export-sdg').addEventListener('click', () => {
  download('sdg.csv', toSdgCsv(loadSdg()));
  notify('Export CSV téléchargé');
});

document.getElementById('duplicate-year').addEventListener('click', () => {
  const source = document.getElementById('duplicate-source').value;
  const target = document.getElementById('duplicate-target').value;
  if (!source || !target || source === target) { notify('Renseignez une année source et une année cible distinctes'); return; }
  try {
    const count = duplicateYear(source, target, { copyBudgets: false });
    notify(count + ' opérations copiées vers ' + target);
    render();
  } catch (e) {
    notify(e.message);
  }
});

document.getElementById('cmp-year-a').addEventListener('change', renderComparison);
document.getElementById('cmp-year-b').addEventListener('change', renderComparison);

document.getElementById('op-file-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = parseCsv(text);
  if (lines.length < 2) { notify('Fichier vide ou illisible'); return; }
  const header = lines[0].map((h) => h.trim());
  const aligned = OPERATION_COLUMNS.every((c, i) => (header[i] || '').startsWith(c.split(' (')[0].slice(0, 8)));
  let records;
  if (aligned) {
    records = lines.slice(1).map(normalizeOperation);
  } else {
    const idx = OPERATION_COLUMNS.map((c) => header.findIndex((h) => h.toLowerCase().startsWith(c.toLowerCase().split(' (')[0].slice(0, 8))));
    if (idx.some((i) => i === -1)) { notify('En-têtes non reconnus — attendus : ' + OPERATION_COLUMNS.join(' | ')); return; }
    records = lines.slice(1).map((values) => normalizeOperation(idx.map((i) => values[i])));
  }
  const count = importOperations(records);
  render();
  notify(count + ' opérations importées');
  event.target.value = '';
});

document.getElementById('sdg-file-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = parseCsv(text);
  if (lines.length < 2) { notify('Fichier vide ou illisible'); return; }
  const header = lines[0].map((h) => h.trim());
  const records = lines.slice(1)
    .map((values) => normalizeSdgRow(values, header))
    .filter((r) => r.sdg);
  if (!records.length) { notify('Aucune SDG reconnue (colonne « SDG » requise)'); return; }
  const count = importSdg(records);
  render();
  notify(count + ' SDG importées');
  event.target.value = '';
});

render();
