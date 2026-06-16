import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { runMigrations } from './migrations'
import { SEED_EXERCISES } from '@shared/data/exercises.seed'

let db: Database.Database | null = null

/** Ouvre (ou crée) la base SQLite au chemin donné et applique les migrations. */
export function initDatabase(dbPath: string): Database.Database {
  const dir = dirname(dbPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)
  seedExercises(db)
  return db
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Base de données non initialisée')
  return db
}

export function closeDatabase(): void {
  db?.close()
  db = null
}

/**
 * Synchronise le catalogue d'exercices au démarrage :
 * - exercice absent  -> inséré ;
 * - exercice présent et NON personnalisé (`custom: false`) -> rafraîchi vers la
 *   dernière version du seed (nouvelles images, corrections, alternatives…) ;
 * - exercice personnalisé par l'utilisateur (`custom: true`) -> laissé intact.
 */
function seedExercises(database: Database.Database): void {
  const getOne = database.prepare('SELECT data FROM exercises WHERE id = ?')
  const insert = database.prepare('INSERT INTO exercises (id, data) VALUES (?, ?)')
  const update = database.prepare('UPDATE exercises SET data = ? WHERE id = ?')
  const tx = database.transaction((rows: typeof SEED_EXERCISES) => {
    for (const ex of rows) {
      const row = getOne.get(ex.id) as { data: string } | undefined
      if (!row) {
        insert.run(ex.id, JSON.stringify(ex))
        continue
      }
      const existing = JSON.parse(row.data) as { custom?: boolean }
      if (!existing.custom) update.run(JSON.stringify(ex), ex.id)
    }
  })
  tx(SEED_EXERCISES)
}
