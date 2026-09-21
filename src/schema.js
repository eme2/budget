/**
 * Schéma de données et règles de calcul du budget.
 *
 * Deux entités :
 *  - les opérations (dépenses suivies ligne par ligne, année après année)
 *  - le référentiel SDG (données de référence importées de l'outil financier)
 *
 * Les champs "calculés" (budget_prevu, credit_restant, quantite_restante)
 * ne sont jamais saisis : ils sont recalculés par computeDerived() à chaque
 * lecture, ce qui garantit leur cohérence avec les champs saisis.
 */
(function (global) {
  const B = global.Budget || (global.Budget = {});

  /**
   * Étapes budgétaires de l'année, dans l'ordre chronologique :
   * 1. Budget principal        — première prévision votée
   * 2. Budget supplémentaire   — ajustement (ajout ou diminution)
   * 3. Décision modificative   — ajustement ultérieur
   * Une étape peut être négative (diminution de crédits).
   */
  const BUDGET_STEPS = [
    'Budget principal',
    'Budget supplémentaire',
    'Décision modificative',
  ];

  /** Intitulés des colonnes du tableau des opérations (ordre d'affichage). */
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

  /**
   * Identifiants internes des champs d'une opération.
   * L'ordre correspond exactement à OPERATION_COLUMNS : un enregistrement
   * importé/exporté en CSV est aligné position par position.
   */
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

  /** Champs traités comme des nombres (montants ou quantités). */
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

  /**
   * Convertit une saisie en nombre.
   * Accepte la virgule décimale française et les espaces de milliers
   * ("1 234,5" → 1234.5). Renvoie null si la valeur est vide ou non numérique,
   * ce qui distingue "non renseigné" de "zéro".
   */
  function toNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(String(value).replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  /**
   * Recalcule les champs dérivés d'une opération :
   *  - budget_prevu      = budget_principal + budget_supplementaire + decision_modificative
   *                        (les étapes non renseignées sont ignorées ; une étape
   *                        négative vient en diminution)
   *  - credit_restant    = budget_prevu − depense_realisee
   *  - quantite_restante = quantite_prevue − quantite_achetee
   * Un calcul n'est effectué que si toutes ses données sources sont renseignées :
   * le champ dérivé reste alors absent plutôt que faussement nul.
   */
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

  /**
   * Normalise un code opération au format "année-numéro" :
   * "2025 - 12" et "2025/03" deviennent "2025-12". L'année du code
   * sert de clé de regroupement pour le suivi pluriannuel.
   */
  function normalizeCode(code) {
    const m = String(code).match(/(\d{4})\s*[-/]\s*(\d+)/);
    return m ? `${m[1]}-${m[2]}` : String(code).trim();
  }

  /** Extrait l'année d'un code opération ("2025-12" → "2025", sinon ""). */
  function operationYear(code) {
    const m = String(code || '').match(/^(\d{4})-/);
    return m ? m[1] : '';
  }

  /** Les deux natures possibles d'une SDG. */
  const SDG_TYPES = ['Fonctionnement', 'Investissement'];
  const SDG_COLUMNS = ['SDG', 'Libellé', 'Type', 'Ligne budgétaire'];
  const SDG_FIELDS = ['sdg', 'libelle', 'type', 'ligne_budgetaire'];

  /** Opération vierge : tous les champs présents mais vides. */
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
