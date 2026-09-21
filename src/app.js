const { COLUMNS, FIELDS, NUMERIC_FIELDS, computeDerived, emptyRow } = window.Budget;
const { loadOperations, saveOperations, normalizeRecord, parseCsv, toCsv, importRows, clearOperations } = window.Budget;

const body = document.getElementById('table-body');
const headRow = document.getElementById('head-row');
const footRow = document.getElementById('foot-row');
const msg = document.getElementById('msg');
const isComputed = (f) => f === 'reste_a_engager' || f === 'besoins';

COLUMNS.forEach((name) => {
  const th = document.createElement('th');
  th.textContent = name;
  th.title = name;
  headRow.appendChild(th);
});
const actionTh = document.createElement('th');
actionTh.textContent = '';
headRow.appendChild(actionTh);

function notify(text) {
  msg.textContent = text;
  msg.style.display = 'block';
  setTimeout(() => { msg.style.display = 'none'; }, 2500);
}

function render() {
  const rows = loadOperations();
  body.innerHTML = '';
  const sums = Object.fromEntries(FIELDS.filter((f) => NUMERIC_FIELDS.has(f)).map((f) => [f, 0]));
  rows.forEach((row, rowIndex) => {
    const derived = computeDerived(row);
    const tr = document.createElement('tr');
    FIELDS.forEach((field) => {
      const td = document.createElement('td');
      if (isComputed(field)) {
        td.className = 'computed';
        td.textContent = derived[field] ?? '';
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
      if (NUMERIC_FIELDS.has(field) && typeof derived[field] === 'number') {
        sums[field] += derived[field];
      }
    });
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
    body.appendChild(tr);
  });
  footRow.innerHTML = '';
  FIELDS.forEach((field) => {
    const td = document.createElement('td');
    if (NUMERIC_FIELDS.has(field)) {
      const v = sums[field];
      td.textContent = v ? v.toLocaleString('fr-FR') : '';
    }
    footRow.appendChild(td);
  });
  footRow.appendChild(document.createElement('td'));
  const nb = rows.length;
  document.getElementById('totals').textContent =
    nb + (nb > 1 ? ' opérations' : ' opération') +
    ' — Reste à engager total : ' +
    (sums.reste_a_engager || 0).toLocaleString('fr-FR');
}

document.getElementById('add-row').addEventListener('click', () => {
  const rows = loadOperations();
  rows.push(emptyRow());
  saveOperations(rows);
  render();
});

document.getElementById('clear-all').addEventListener('click', () => {
  if (loadOperations().length === 0 || confirm('Effacer toutes les opérations du stockage du navigateur ?')) {
    clearOperations();
    render();
  }
});

document.getElementById('export-csv').addEventListener('click', () => {
  const csv = toCsv(loadOperations());
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'budget.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  notify('Export CSV téléchargé');
});

document.getElementById('file-input').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const text = await file.text();
  const lines = parseCsv(text);
  if (lines.length < 2) { notify('Fichier vide ou illisible'); return; }
  const header = lines[0].map((h) => h.trim());
  const aligned = COLUMNS.every((c, i) => (header[i] || '').startsWith(c.split(' (')[0].slice(0, 8)));
  let records;
  if (aligned) {
    records = lines.slice(1).map(normalizeRecord);
  } else {
    const idx = COLUMNS.map((c) => header.indexOf(c));
    if (idx.some((i) => i === -1)) { notify('En-têtes non reconnus'); return; }
    records = lines.slice(1).map((values) => normalizeRecord(idx.map((i) => values[i])));
  }
  const count = importRows(records);
  render();
  notify(count + ' opérations importées');
  event.target.value = '';
});

render();
