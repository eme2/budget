# budget

Gestion d'un budget — application navigateur, sans serveur ni base de données externe. Les données sont stockées dans le `localStorage` du navigateur, ce qui suffit pour un petit volume d'opérations.

## Modèle de données

### Opérations (onglet « Opérations »)

Chaque ligne contient :

| Champ | Description |
|---|---|
| **Code opération** | format `année-numéro` (ex : `2025-12`) — normalisé à l'import |
| **SDG** | numéro du découpage budgétaire (ex : `22`, `4490`) — cf. référentiel SDG |
| **Libellé de la dépense** | description |
| **Sous-type** | ex : réforme, extension, projet particulier |
| **Budget prévu** | montant prévu |
| **Dépense réalisée (engagée)** | montant engagé |
| **Crédit restant** | *calculé* : Budget prévu − Dépense réalisée |
| **Quantité prévue** | |
| **Quantité achetée** | |
| **Quantité restante** | *calculé* : Quantité prévue − Quantité achetée |

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

- **Saisie** : bouton « + Ligne », édition directe des cellules, sauvegarde automatique
- **Colonnes calculées** : « Crédit restant » et « Quantité restante » se recalculent seules
- **Totaux** : ligne de pied de tableau et compteurs (dont crédit restant total)
- **Importer CSV** : opérations ou référentiel SDG selon l'onglet actif ; séparateur `;` ou `,`, guillemets gérés ; l'import SDG reconnaît les en-têtes de l'outil financier par mots-clés (sdg/code, libellé/intitulé, type/nature, ligne/imputation) ; fusion par clé (code opération + SDG + sous-type, ou code SDG)
- **Exporter CSV** : fichiers `operations.csv` / `sdg.csv` (BOM UTF-8, s'ouvrent dans Excel)
- **Tout effacer** : vide le stockage (confirmation demandée)

## Tests

```bash
npm test
```

## Fichiers

- `index.html` — structure de l'interface (onglets Opérations / Référentiel SDG)
- `styles.css` — styles
- `src/app.js` — logique de l'interface
- `src/schema.js` — colonnes, champs, calculs dérivés
- `src/storage.js` — persistance `localStorage`, import/export CSV
- `test/` — tests unitaires (`node:test`)
