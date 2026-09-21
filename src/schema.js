(function (global) {
  const B = global.Budget || (global.Budget = {});

  const OPERATION_COLUMNS = [
    'Code opération',
    'SDG',
    'Libellé de la dépense',
    'Sous-type',
    'Budget prévu',
    'Dépense réalisée (engagée)',
    'Crédit restant',
    'Quantité prévue',
    'Quantité achetée',
    'Quantité restante',
  ];

  const OPERATION_FIELDS = [
    'code_operation',
    'sdg',
    'libelle',
    'sous_type',
    'budget_prevu',
    'depense_realisee',
    'credit_restant',
    'quantite_prevue',
    'quantite_achetee',
    'quantite_restante',
  ];

  const NUMERIC_FIELDS = new Set([
    'budget_prevu',
    'depense_realisee',
    'credit_restant',
    'quantite_prevue',
    'quantite_achetee',
    'quantite_restante',
  ]);

  const COMPUTED = ['credit_restant', 'quantite_restante'];

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(String(value).replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function computeDerived(row) {
    const result = { ...row };
    if (toNumber(result.budget_prevu) !== null && toNumber(result.depense_realisee) !== null) {
      result.credit_restant = toNumber(result.budget_prevu) - toNumber(result.depense_realisee);
    }
    if (toNumber(result.quantite_prevue) !== null && toNumber(result.quantite_achetee) !== null) {
      result.quantite_restante = toNumber(result.quantite_prevue) - toNumber(result.quantite_achetee);
    }
    return result;
  }

  const SDG_TYPES = ['Fonctionnement', 'Investissement'];

  const SDG_COLUMNS = ['SDG', 'Libellé', 'Type', 'Ligne budgétaire'];
  const SDG_FIELDS = ['sdg', 'libelle', 'type', 'ligne_budgetaire'];
  const SDG_TYPES_SET = SDG_TYPES;

  function emptyOperation() {
    return Object.fromEntries(OPERATION_FIELDS.map((f) => [f, '']));
  }

  Object.assign(B, {
    OPERATION_COLUMNS, OPERATION_FIELDS, NUMERIC_FIELDS, COMPUTED,
    SDG_TYPES, SDG_COLUMNS, SDG_FIELDS, SDG_TYPES_SET,
    toNumber, computeDerived, emptyOperation,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
