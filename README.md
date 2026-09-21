# budget

Gestion d'un budget — application navigateur, sans serveur ni base de données externe. Les données sont stockées dans le `localStorage` du navigateur (workspace local), ce qui suffit pour un petit volume d'opérations.

## Structure

Les opérations suivent 17 colonnes de suivi (voir `src/schema.js`) :
Code opération, Libellé opération, SDG, Types d'achat, Budget validé A (acquisitions), Budget initial, Qtés validées A (à acquérir), Engagé (sans compter le RAR), **Reste à engager** (calculé), **Besoins + ou -** (calculé), Commentaire A, BS, Commentaire BS, Nb Acquis, DM, Commentaire DM, Montant acquis.

- `Reste à engager` = Budget validé A − Engagé (hors RAR)
- `Besoins + ou -` = Qtés validées A − Nb Acquis

## Utilisation

Ouvrir `index.html` dans un navigateur (double-clic suffit, aucune installation).

- **Saisie** : bouton « + Ligne », puis édition directe des cellules ; sauvegarde automatique dans le navigateur
- **Colonnes calculées** : « Reste à engager » et « Besoins + ou - » se recalculent seules
- **Totaux** : ligne de pied de tableau et compteur en haut
- **Importer CSV** : bouton dans l'en-tête — accepte un export Excel/CSV (séparateur `;` ou `,`, guillemets gérés) ; fusion par clé (code opération + SDG + type d'achat)
- **Exporter CSV** : télécharge `budget.csv` (avec BOM UTF-8, s'ouvre directement dans Excel)
- **Tout effacer** : vide le stockage du navigateur (confirmation demandée)

## Tests

```bash
npm test
```

## Fichiers

- `index.html` — interface (table éditable, import/export, totaux)
- `src/schema.js` — colonnes, champs, calculs dérivés
- `src/storage.js` — persistance `localStorage`, analyse et génération CSV
- `test/` — tests unitaires (`node:test`)
