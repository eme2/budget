const {
  OPERATION_COLUMNS, OPERATION_FIELDS, NUMERIC_FIELDS, SDG_COLUMNS, SDG_FIELDS, SDG_TYPES,
  computeDerived, emptyOperation, inferSdgType,
} = window.Budget;
const {
  loadOperations, saveOperations, loadSdg, saveSdg,
  normalizeOperation, normalizeSdgRow, parseCsv, toOperationsCsv, toSdgCsv,
  importOperations, importSdg, clearOperations, clearSdg,
} = window.Budget;

const msg = document.getElementById('msg');
const isComputed = (f) => f === 'credit_restant' || f === 'quantite_restante';

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
  render();
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => setTab(tab.dataset.tab));
});

function renderTable(headEl, bodyEl, footEl, columns, fields, rows, renderCell, sumFields) {
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
    renderCell(tr, row, rowIndex);
    for (const [field, cell] of Object.entries(tr.dataset.sums || {})) sums[field] = (sums[field] || 0) + Number(cell || 0);
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
        } else {
          if (NUMERIC_FIELDS.has(field)) td.className = 'numeric';
          const input = document.createElement('input');
          input.value = row[field] ?? '';
          input.addEventListener('change', () => {
            const rows = loadOperations();
            rows[rowIndex][field] = input.value;
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
    nb + (nb > 1 ? ' SDG' : ' SDG') +
    ' — Fonctionnement : ' + (sdgTypes.get('Fonctionnement') || 0) +
    ', Investissement : ' + (sdgTypes.get('Investissement') || 0);
}

function render() {
  renderOperations();
  renderSdg();
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
