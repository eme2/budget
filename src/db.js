import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { initDb } from './schema.js';
import { importXlsx, exportXlsx, exportCsv } from './excel.js';

const DB_PATH = process.env.BUDGET_DB || path.resolve('data/budget.db');

export function openDb(dbPath = DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  initDb(db);
  return db;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') args.file = argv[++i];
    else if (argv[i] === '--db') args.db = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const db = openDb(args.db);

  switch (command) {
    case 'init': {
      console.log(`Base de données prête : ${args.db || DB_PATH}`);
      break;
    }
    case 'import': {
      if (!args.file) throw new Error('Usage : node src/db.js import --file <fichier.xlsx>');
      const count = await importXlsx(args.file, db);
      console.log(`${count} opérations importées depuis ${args.file}`);
      break;
    }
    case 'export': {
      if (!args.file) throw new Error('Usage : node src/db.js export --file <fichier>');
      const isCsv = args.file.toLowerCase().endsWith('.csv');
      const count = isCsv ? await exportCsv(args.file, db) : await exportXlsx(args.file, db);
      console.log(`${count} opérations exportées vers ${args.file}`);
      break;
    }
    default: {
      console.log('Commandes : init | import --file <fichier> | export --file <fichier>');
      console.log(`Options : --db <chemin> (défaut : ${DB_PATH})`);
    }
  }

  db.close();
}

if (process.argv[1] === import.meta.url.slice(7)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
