import type Database from 'better-sqlite3'

/** Une migration = un numéro de version + le SQL à exécuter. */
interface Migration {
  version: number
  up: string
}

/**
 * Migrations versionnées. Pour faire évoluer le schéma, ajouter une entrée
 * avec un `version` strictement supérieur — jamais modifier une migration
 * déjà publiée.
 *
 * Choix d'architecture : les entités riches (programmes, séances…) sont
 * stockées en JSON dans une colonne `data`, avec quelques colonnes indexées
 * pour les requêtes. Simple, robuste et suffisant pour une app personnelle.
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS profile (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS limitations (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        program_id TEXT,
        date TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_program ON sessions(program_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);
      CREATE TABLE IF NOT EXISTS daily_states (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS measures (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        data TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ratings (
        exercise_id TEXT PRIMARY KEY,
        data TEXT NOT NULL
      );
    `,
  },
]

/** Applique toutes les migrations non encore appliquées. */
export function runMigrations(db: Database.Database): void {
  db.exec('CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)')
  const row = db.prepare('SELECT MAX(version) AS v FROM schema_meta').get() as { v: number | null }
  const current = row.v ?? 0

  const pending = MIGRATIONS.filter((m) => m.version > current).sort((a, b) => a.version - b.version)
  const apply = db.transaction((migrations: Migration[]) => {
    for (const m of migrations) {
      db.exec(m.up)
      db.prepare('INSERT INTO schema_meta (version) VALUES (?)').run(m.version)
    }
  })
  if (pending.length) apply(pending)
}
