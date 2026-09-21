export const COLUMNS = [
  'Code opération',
  'Libellé opération',
  'SDG',
  "Types d'achat",
  'Budget validé A (acquisitions)',
  'Budget initial',
  'Qtés validées A (à acquérir)',
  'Engagé (sans compter le RAR)',
  'Reste à engager',
  'Besoins + ou -',
  'Commentaire A',
  'BS',
  'Commentaire BS',
  'Nb Acquis',
  'DM',
  'Commentaire DM',
  'Montant acquis',
];

export const FIELDS = [
  'code_operation',
  'libelle_operation',
  'sdg',
  'type_achat',
  'budget_valide_a',
  'budget_initial',
  'qtes_validees_a',
  'engage_hors_rar',
  'reste_a_engager',
  'besoins',
  'commentaire_a',
  'bs',
  'commentaire_bs',
  'nb_acquis',
  'dm',
  'commentaire_dm',
  'montant_acquis',
];

export const NUMERIC_FIELDS = new Set([
  'budget_valide_a',
  'budget_initial',
  'qtes_validees_a',
  'engage_hors_rar',
  'reste_a_engager',
  'besoins',
  'bs',
  'nb_acquis',
  'dm',
  'montant_acquis',
]);

export const COMPUTED = {
  reste_a_engager: ({ budget_valide_a, engage_hors_rar }) =>
    budget_valide_a - engage_hors_rar,
  besoins: ({ qtes_validees_a, nb_acquis }) => qtes_validees_a - nb_acquis,
};

export const COMPUTED_DEPS = {
  reste_a_engager: ['budget_valide_a', 'engage_hors_rar'],
  besoins: ['qtes_validees_a', 'nb_acquis'],
};

export function computeDerived(row) {
  const result = { ...row };
  for (const [field, fn] of Object.entries(COMPUTED)) {
    const deps = COMPUTED_DEPS[field];
    if (deps.every((k) => row[k] !== null && row[k] !== undefined)) {
      result[field] = fn(row);
    }
  }
  return result;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS operations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code_operation TEXT,
  libelle_operation TEXT,
  sdg TEXT,
  type_achat TEXT,
  budget_valide_a REAL,
  budget_initial REAL,
  qtes_validees_a REAL,
  engage_hors_rar REAL,
  reste_a_engager REAL,
  besoins REAL,
  commentaire_a TEXT,
  bs REAL,
  commentaire_bs TEXT,
  nb_acquis REAL,
  dm REAL,
  commentaire_dm TEXT,
  montant_acquis REAL,
  UNIQUE (code_operation, sdg, type_achat)
);
CREATE INDEX IF NOT EXISTS idx_operations_code ON operations (code_operation);
CREATE INDEX IF NOT EXISTS idx_operations_sdg ON operations (sdg);
`;

export function initDb(db) {
  db.exec(SCHEMA);
}
