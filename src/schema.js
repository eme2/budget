(function (global) {
  const B = global.Budget || (global.Budget = {});

  const COLUMNS = [
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

  const FIELDS = [
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

  const NUMERIC_FIELDS = new Set([
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

  const COMPUTED_DEPS = {
    reste_a_engager: ['budget_valide_a', 'engage_hors_rar'],
    besoins: ['qtes_validees_a', 'nb_acquis'],
  };

  function computeDerived(row) {
    const result = { ...row };
    if (result.budget_valide_a !== '' && result.budget_valide_a !== null && result.budget_valide_a !== undefined &&
        result.engage_hors_rar !== '' && result.engage_hors_rar !== null && result.engage_hors_rar !== undefined) {
      result.reste_a_engager = Number(result.budget_valide_a) - Number(result.engage_hors_rar);
    }
    if (result.qtes_validees_a !== '' && result.qtes_validees_a !== null && result.qtes_validees_a !== undefined &&
        result.nb_acquis !== '' && result.nb_acquis !== null && result.nb_acquis !== undefined) {
      result.besoins = Number(result.qtes_validees_a) - Number(result.nb_acquis);
    }
    return result;
  }

  function emptyRow() {
    return Object.fromEntries(FIELDS.map((f) => [f, '']));
  }

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(String(value).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  Object.assign(B, { COLUMNS, FIELDS, NUMERIC_FIELDS, COMPUTED_DEPS, computeDerived, emptyRow, toNumber });

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
