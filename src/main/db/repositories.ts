import type { Exercise, ExerciseRating } from '@shared/types/exercise'
import type { Limitation } from '@shared/types/pain'
import type { Profile } from '@shared/types/profile'
import type { Program } from '@shared/types/program'
import type { BodyMeasure, DailyState, SessionLog } from '@shared/types/session'
import { getDb } from './database'

const parse = <T>(row: { data: string } | undefined): T | null =>
  row ? (JSON.parse(row.data) as T) : null
const parseAll = <T>(rows: { data: string }[]): T[] => rows.map((r) => JSON.parse(r.data) as T)

// ---------- Profil (singleton, id fixe) ----------
const PROFILE_ID = 'me'
export const profileRepo = {
  get(): Profile | null {
    const row = getDb().prepare('SELECT data FROM profile WHERE id = ?').get(PROFILE_ID) as
      | { data: string }
      | undefined
    return parse<Profile>(row)
  },
  save(p: Profile): Profile {
    const data = JSON.stringify({ ...p, id: PROFILE_ID })
    getDb()
      .prepare('INSERT INTO profile (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data')
      .run(PROFILE_ID, data)
    return { ...p, id: PROFILE_ID }
  },
}

// ---------- Exercices ----------
export const exerciseRepo = {
  list(): Exercise[] {
    return parseAll<Exercise>(getDb().prepare('SELECT data FROM exercises').all() as { data: string }[])
  },
  save(ex: Exercise): Exercise {
    getDb()
      .prepare('INSERT INTO exercises (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data')
      .run(ex.id, JSON.stringify(ex))
    return ex
  },
  delete(id: string): void {
    getDb().prepare('DELETE FROM exercises WHERE id = ?').run(id)
  },
}

// ---------- Limitations ----------
export const limitationRepo = {
  list(): Limitation[] {
    return parseAll<Limitation>(getDb().prepare('SELECT data FROM limitations').all() as { data: string }[])
  },
  save(l: Limitation): Limitation {
    getDb()
      .prepare('INSERT INTO limitations (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data')
      .run(l.id, JSON.stringify(l))
    return l
  },
  delete(id: string): void {
    getDb().prepare('DELETE FROM limitations WHERE id = ?').run(id)
  },
}

// ---------- Programmes ----------
export const programRepo = {
  list(): Program[] {
    return parseAll<Program>(
      getDb().prepare('SELECT data FROM programs ORDER BY updated_at DESC').all() as { data: string }[],
    )
  },
  get(id: string): Program | null {
    return parse<Program>(
      getDb().prepare('SELECT data FROM programs WHERE id = ?').get(id) as { data: string } | undefined,
    )
  },
  save(p: Program): Program {
    getDb()
      .prepare(
        `INSERT INTO programs (id, status, updated_at, data) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, data = excluded.data`,
      )
      .run(p.id, p.status, p.updatedAt, JSON.stringify(p))
    return p
  },
  setActive(id: string): void {
    const db = getDb()
    const tx = db.transaction(() => {
      // Un seul programme actif à la fois.
      for (const p of programRepo.list()) {
        if (p.status === 'actif' && p.id !== id) programRepo.save({ ...p, status: 'archive' })
      }
      const target = programRepo.get(id)
      if (target) programRepo.save({ ...target, status: 'actif' })
    })
    tx()
  },
  delete(id: string): void {
    getDb().prepare('DELETE FROM programs WHERE id = ?').run(id)
  },
}

// ---------- Séances réalisées ----------
export const sessionRepo = {
  list(programId?: string): SessionLog[] {
    const db = getDb()
    const rows = programId
      ? (db.prepare('SELECT data FROM sessions WHERE program_id = ? ORDER BY date DESC').all(programId) as {
          data: string
        }[])
      : (db.prepare('SELECT data FROM sessions ORDER BY date DESC').all() as { data: string }[])
    return parseAll<SessionLog>(rows)
  },
  save(s: SessionLog): SessionLog {
    getDb()
      .prepare(
        `INSERT INTO sessions (id, program_id, date, data) VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET program_id = excluded.program_id, date = excluded.date, data = excluded.data`,
      )
      .run(s.id, s.programId, s.date, JSON.stringify(s))
    return s
  },
  delete(id: string): void {
    getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id)
  },
}

// ---------- État du jour ----------
export const dailyStateRepo = {
  get(date: string): DailyState | null {
    return parse<DailyState>(
      getDb().prepare('SELECT data FROM daily_states WHERE date = ?').get(date) as { data: string } | undefined,
    )
  },
  list(): DailyState[] {
    return parseAll<DailyState>(
      getDb().prepare('SELECT data FROM daily_states ORDER BY date ASC').all() as { data: string }[],
    )
  },
  save(s: DailyState): DailyState {
    getDb()
      .prepare(
        `INSERT INTO daily_states (id, date, data) VALUES (?, ?, ?)
         ON CONFLICT(date) DO UPDATE SET data = excluded.data`,
      )
      .run(s.id, s.date, JSON.stringify(s))
    return s
  },
}

// ---------- Mesures corporelles ----------
export const measureRepo = {
  list(): BodyMeasure[] {
    return parseAll<BodyMeasure>(
      getDb().prepare('SELECT data FROM measures ORDER BY date DESC').all() as { data: string }[],
    )
  },
  save(m: BodyMeasure): BodyMeasure {
    getDb()
      .prepare('INSERT INTO measures (id, date, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET date = excluded.date, data = excluded.data')
      .run(m.id, m.date, JSON.stringify(m))
    return m
  },
  delete(id: string): void {
    getDb().prepare('DELETE FROM measures WHERE id = ?').run(id)
  },
}

// ---------- Notations d'exercices ----------
export const ratingRepo = {
  list(): ExerciseRating[] {
    return parseAll<ExerciseRating>(getDb().prepare('SELECT data FROM ratings').all() as { data: string }[])
  },
  save(r: ExerciseRating): ExerciseRating {
    getDb()
      .prepare('INSERT INTO ratings (exercise_id, data) VALUES (?, ?) ON CONFLICT(exercise_id) DO UPDATE SET data = excluded.data')
      .run(r.exerciseId, JSON.stringify(r))
    return r
  },
}
