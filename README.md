# budget

Gestion d'un budget — import/export Excel et stockage SQLite.

## Structure

Les opérations suivent 17 colonnes de suivi (voir `src/schema.js`) :
Code opération, Libellé opération, SDG, Types d'achat, Budget validé A (acquisitions), Budget initial, Qtés validées A (à acquérir), Engagé (sans compter le RAR), **Reste à engager** (calculé), **Besoins + ou -** (calculé), Commentaire A, BS, Commentaire BS, Nb Acquis, DM, Commentaire DM, Montant acquis.

- `Reste à engager` = Budget validé A − Engagé (hors RAR)
- `Besoins + ou -` = Qtés validées A − Nb Acquis

## Prérequis

- Node.js ≥ 20
- `npm install`

## Utilisation

```bash
npm run generate        # régénère budget.xlsx (modèle vide avec formules)
npm run db:init         # crée la base data/budget.db
npm run db:import       # importe budget.xlsx dans la base
npm run db:export       # exporte la base vers budget.xlsx
npm run db:export:csv   # exporte la base vers budget.csv
npm test                # tests
```

Options : `--file <chemin>` pour choisir le fichier, `--db <chemin>` pour la base (défaut `data/budget.db`, variable `BUDGET_DB`).

L'import met à jour les lignes existantes (clé : code opération + SDG + type d'achat).
