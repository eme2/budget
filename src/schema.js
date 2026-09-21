(function (global) {
  const B = global.Budget || (global.Budget = {});

  const BUDGET_STEPS = [
    'Budget principal',
    'Budget supplémentaire',
    'Décision modificative',
  ];

  const OPERATION_COLUMNS = [
    'Code opération',
    'SDG',
    'Libellé de la dépense',
    'Sous-type',
    'Budget principal',
    'Budget supplémentaire',
    'Décision modificative',
    'Budget prévu',
    'Dépense réalisée (engagée)',
    'Crédit restant',
    'Quantité prévue',
    'Quantité achetée',
    'Quantité restante',
    'Commentaire',
  ];

  const OPERATION_FIELDS = [
    'code_operation',
    'sdg',
    'libelle',
    'sous_type',
    'budget_principal',
    'budget_supplementaire',
    'decision_modificative',
    'budget_prevu',
    'depense_realisee',
    'credit_restant',
    'quantite_prevue',
    'quantite_achetee',
    'quantite_restante',
    'commentaire',
  ];

  const NUMERIC_FIELDS = new Set([
    'budget_principal',
    'budget_supplementaire',
    'decision_modificative',
    'budget_prevu',
    'depense_realisee',
    'credit_restant',
    'quantite_prevue',
    'quantite_achetee',
    'quantite_restante',
  ]);

  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(String(value).replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function computeDerived(row) {
    const result = { ...row };
    const principal = toNumber(result.budget_principal);
    const supplementaire = toNumber(result.budget_supplementaire);
    const modificative = toNumber(result.decision_modificative);
    const parts = [principal, supplementaire, modificative].filter((v) => v !== null);
    if (parts.length) {
      result.budget_prevu = parts.reduce((a, b) => a + b, 0);
    }
    const budgetPrevu = toNumber(result.budget_prevu);
    const depense = toNumber(result.depense_realisee);
    if (budgetPrevu !== null && depense !== null) {
      result.credit_restant = budgetPrevu - depense;
    }
    const qPrevue = toNumber(result.quantite_prevue);
    const qAchetee = toNumber(result.quantite_achetee);
    if (qPrevue !== null && qAchetee !== null) {
      result.quantite_restante = qPrevue - qAchetee;
    }
    return result;
  }

  function normalizeCode(code) {
    const m = String(code).match(/(\d{4})\s*[-/]\s*(\d+)/);
    return m ? `${m[1]}-${m[2]}` : String(code).trim();
  }

  function operationYear(code) {
    const m = String(code || '').match(/^(\d{4})-/);
    return m ? m[1] : '';
  }

  const SDG_TYPES = ['Fonctionnement', 'Investissement'];
  const SDG_COLUMNS = ['SDG', 'Libellé', 'Type', 'Ligne budgétaire'];
  const SDG_FIELDS = ['sdg', 'libelle', 'type', 'ligne_budgetaire'];

  function emptyOperation() {
    return Object.fromEntries(OPERATION_FIELDS.map((f) => [f, '']));
  }

  Object.assign(B, {
    BUDGET_STEPS, OPERATION_COLUMNS, OPERATION_FIELDS, NUMERIC_FIELDS,
    SDG_TYPES, SDG_COLUMNS, SDG_FIELDS,
    toNumber, computeDerived, normalizeCode, operationYear, emptyOperation,
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof window !== 'undefined' ? window : globalThis);
