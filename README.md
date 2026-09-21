# budget

Gestion d'un budget — application navigateur, sans serveur ni base de données externe. Les données sont stockées dans le `localStorage` du navigateur, ce qui suffit pour un petit volume d'opérations.

## Modèle de données

### Opérations (onglet « Opérations »)

Chaque ligne contient :

| Champ | Description |
|---|---|
| **Code opération** | format `année-numéro` (ex : `2025-12`) — normalisé à l'import ; l'année sert au regroupement et à la comparaison |
| **SDG** | numéro du découpage budgétaire (ex : `22`, `4490`) — cf. référentiel SDG |
| **Libellé de la dépense** | description |
| **Sous-type** | ex : réforme, extension, projet particulier |
| **Budget principal** | première prévision de l'année |
| **Budget supplémentaire** | ajout / diminution lors de l'étape « budget supplémentaire » (peut être négatif) |
| **Décision modificative** | ajout / diminution lors de l'étape « décision modificative » (peut être négatif) |
| **Budget prévu** | *calculé* : principal + supplémentaire + modificative |
| **Dépense réalisée (engagée)** | montant engagé |
| **Crédit restant** | *calculé* : Budget prévu − Dépense réalisée |
| **Quantité prévue** | |
| **Quantité achetée** | |
| **Quantité restante** | *calculée* : Quantité prévue − Quantité achetée |
| **Commentaire** | historique des évolutions — toute modification d'un montant ou d'une quantité y est tracée automatiquement (`[date] champ : ancien → nouveau`) ; saisie manuelle possible |

Ajout / suppression de lignes : boutons « + Ligne » et « ✕ » sur chaque ligne.

### Suivi annuel

Les lignes sont globalement identiques d'une année à l'autre ; les montants évoluent. L'application conserve toutes les années :

- **Nouvelle année** : saisir l'année source (ex `2025`) et l'année cible (ex `2026`) puis « Copier les lignes » — les libellés, SDG et sous-types sont recopiés, les dépenses, quantités achetées, budgets et commentaires remis à zéro
- **Comparaison annuelle** (onglet dédié) : sélection de deux années, écarts par ligne et totaux (écart budget, écart dépense), lignes nouvelles ou disparues incluses

### Référentiel SDG (onglet « Référentiel SDG »)

Données de référence des SDG, importées régulièrement depuis l'export de l'outil financier :

| Champ | Description |
|---|---|
| **SDG** | code (ex : `22`, `4490`) |
| **Libellé** | intitulé |
| **Type** | `Fonctionnement` ou `Investissement` (déduit automatiquement à l'import : « Fonctionnement », « Dépenses courantes », « F »… / « Investissement », « capital »…) |
| **Ligne budgétaire** | ex : `22`, `4490` |

### Dépenses

Une liste détaillée des dépenses est prévue (extension future) ; l'espace de stockage est déjà réservé.

## Utilisation

Ouvrir `index.html` dans un navigateur (double-clic suffit, aucune installation).

- **Saisie** : édition directe des cellules, sauvegarde automatique
- **Colonnes calculées** : « Budget prévu », « Crédit restant », « Quantité restante »
- **Traçabilité** : les modifications de budgets / dépenses / quantités sont horodatées dans le commentaire
- **Importer CSV** : opérations ou référentiel SDG selon l'onglet ; séparateur `;` ou `,` ; fusion par clé (code opération + SDG + sous-type, ou code SDG)
- **Exporter CSV** : `operations.csv` / `sdg.csv` (BOM UTF-8, s'ouvrent dans Excel)
- **Tout effacer** : vide le stockage (confirmation demandée)

## Tests

```bash
npm test
```

## Fichiers

- `index.html` — structure de l'interface (onglets Opérations / Référentiel SDG / Comparaison annuelle)
- `styles.css` — styles
- `src/app.js` — logique de l'interface
- `src/schema.js` — colonnes, champs, calculs dérivés
- `src/storage.js` — persistance `localStorage`, import/export CSV, gestion des années
- `test/` — tests unitaires (`node:test`)
