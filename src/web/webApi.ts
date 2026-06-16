// Implémentation web de l'interface `Api` (la même que le pont Electron).
// Stockage : IndexedDB. Génération de programme : moteur métier `@shared/domain`
// exécuté directement dans le navigateur. Aucune donnée ne quitte l'appareil.
import type { Api } from '@shared/ipc/contract'
import type { Exercise, ExerciseRating } from '@shared/types/exercise'
import type { Limitation } from '@shared/types/pain'
import type { Profile } from '@shared/types/profile'
import type { Program, ProgramConfig } from '@shared/types/program'
import type { BodyMeasure, DailyState, SessionLog } from '@shared/types/session'
import { generateProgram } from '@shared/domain/generator/generateProgram'
import { SEED_EXERCISES } from '@shared/data/exercises.seed'
import { idb } from './idb'

const uuid = () => crypto.randomUUID()
const now = () => new Date().toISOString()
const PROFILE_KEY = 'me'

// ---- Helpers DOM (fichiers) ----
function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}
function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}
function downloadBlob(content: string, filename: string, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Synchronise le catalogue d'exercices au démarrage (même logique qu'Electron). */
export async function ensureWebSeed(): Promise<void> {
  const existing = await idb.getAll<Exercise>('exercises')
  const byId = new Map(existing.map((e) => [e.id, e]))
  for (const ex of SEED_EXERCISES) {
    const cur = byId.get(ex.id)
    if (!cur) await idb.put('exercises', ex.id, ex)
    else if (!cur.custom) await idb.put('exercises', ex.id, ex)
  }
}

export const webApi: Api = {
  // ---- Profil ----
  async getProfile() {
    return (await idb.get<Profile>('profile', PROFILE_KEY)) ?? null
  },
  async saveProfile(p: Profile) {
    const saved = { ...p, id: PROFILE_KEY, updatedAt: now() }
    await idb.put('profile', PROFILE_KEY, saved)
    return saved
  },

  // ---- Exercices ----
  listExercises: () => idb.getAll<Exercise>('exercises'),
  async saveExercise(ex: Exercise) {
    const saved = { ...ex, id: ex.id || uuid() }
    await idb.put('exercises', saved.id, saved)
    return saved
  },
  async deleteExercise(id: string) {
    await idb.delete('exercises', id)
  },

  // ---- Limitations ----
  listLimitations: () => idb.getAll<Limitation>('limitations'),
  async saveLimitation(l: Limitation) {
    const saved = { ...l, id: l.id || uuid(), updatedAt: now(), createdAt: l.createdAt || now() }
    await idb.put('limitations', saved.id, saved)
    return saved
  },
  async deleteLimitation(id: string) {
    await idb.delete('limitations', id)
  },

  // ---- Programmes ----
  async generateProgram(config: ProgramConfig) {
    const profile = await idb.get<Profile>('profile', PROFILE_KEY)
    const program = generateProgram({
      config,
      level: profile?.level ?? 'intermediaire',
      catalog: await idb.getAll<Exercise>('exercises'),
      limitations: await idb.getAll<Limitation>('limitations'),
      ratings: await idb.getAll<ExerciseRating>('ratings'),
      makeId: () => uuid(),
      now: now(),
    })
    await idb.put('programs', program.id, program)
    return program
  },
  async listPrograms() {
    const list = await idb.getAll<Program>('programs')
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },
  async getProgram(id: string) {
    return (await idb.get<Program>('programs', id)) ?? null
  },
  async saveProgram(p: Program) {
    const saved = { ...p, updatedAt: now() }
    await idb.put('programs', saved.id, saved)
    return saved
  },
  async setActiveProgram(id: string) {
    const programs = await idb.getAll<Program>('programs')
    for (const p of programs) {
      if (p.id === id) await idb.put('programs', p.id, { ...p, status: 'actif', updatedAt: now() })
      else if (p.status === 'actif') await idb.put('programs', p.id, { ...p, status: 'archive', updatedAt: now() })
    }
  },
  async deleteProgram(id: string) {
    await idb.delete('programs', id)
  },

  // ---- Séances ----
  async listSessions(programId?: string) {
    const list = await idb.getAll<SessionLog>('sessions')
    return list
      .filter((s) => !programId || s.programId === programId)
      .sort((a, b) => b.date.localeCompare(a.date))
  },
  async saveSession(s: SessionLog) {
    const saved = { ...s, id: s.id || uuid(), updatedAt: now(), createdAt: s.createdAt || now() }
    await idb.put('sessions', saved.id, saved)
    return saved
  },
  async deleteSession(id: string) {
    await idb.delete('sessions', id)
  },

  // ---- État du jour ----
  async saveDailyState(s: DailyState) {
    const saved = { ...s, id: s.id || uuid(), createdAt: s.createdAt || now() }
    await idb.put('dailyStates', saved.date, saved)
    return saved
  },
  async getDailyState(date: string) {
    return (await idb.get<DailyState>('dailyStates', date)) ?? null
  },
  listDailyStates: () => idb.getAll<DailyState>('dailyStates'),

  // ---- Mesures ----
  listMeasures: async () => (await idb.getAll<BodyMeasure>('measures')).sort((a, b) => b.date.localeCompare(a.date)),
  async saveMeasure(m: BodyMeasure) {
    const saved = { ...m, id: m.id || uuid() }
    await idb.put('measures', saved.id, saved)
    return saved
  },
  async deleteMeasure(id: string) {
    await idb.delete('measures', id)
  },

  // ---- Images ----
  async resolveImage(spec) {
    if (spec.localPath) {
      const data = await idb.get<string>('images', spec.localPath)
      return data ? { dataUrl: data, localPath: spec.localPath } : null
    }
    if (spec.url) return { dataUrl: spec.url, localPath: '' }
    return null
  },
  async importImage() {
    const file = await pickFile('image/*')
    if (!file) return null
    const dataUrl = await readDataUrl(file)
    const key = 'img_' + uuid()
    await idb.put('images', key, dataUrl)
    return { dataUrl, localPath: key }
  },

  // ---- Divers ----
  async openExternal(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer')
  },

  // ---- Sauvegardes ----
  async exportBackup() {
    const snapshot = {
      version: 1,
      exportedAt: now(),
      profile: await idb.get<Profile>('profile', PROFILE_KEY),
      exercises: await idb.getAll<Exercise>('exercises'),
      limitations: await idb.getAll<Limitation>('limitations'),
      programs: await idb.getAll<Program>('programs'),
      sessions: await idb.getAll<SessionLog>('sessions'),
      measures: await idb.getAll<BodyMeasure>('measures'),
      ratings: await idb.getAll<ExerciseRating>('ratings'),
    }
    downloadBlob(JSON.stringify(snapshot, null, 2), `coach-muscu-backup-${Date.now()}.json`)
    return 'Téléchargements'
  },
  async importBackup() {
    const file = await pickFile('application/json')
    if (!file) return false
    const snap = JSON.parse(await file.text())
    if (snap.profile) await idb.put('profile', PROFILE_KEY, { ...snap.profile, id: PROFILE_KEY })
    for (const ex of snap.exercises ?? []) await idb.put('exercises', ex.id, ex)
    for (const l of snap.limitations ?? []) await idb.put('limitations', l.id, l)
    for (const p of snap.programs ?? []) await idb.put('programs', p.id, p)
    for (const s of snap.sessions ?? []) await idb.put('sessions', s.id, s)
    for (const m of snap.measures ?? []) await idb.put('measures', m.id, m)
    for (const r of snap.ratings ?? []) await idb.put('ratings', r.exerciseId, r)
    return true
  },
  async createBackup() {
    /* automatique non nécessaire en web : les données sont déjà persistées */
  },
  async seedDemo() {
    await seedWebDemo()
  },
  async resetApp() {
    for (const s of ['profile', 'limitations', 'programs', 'sessions', 'dailyStates', 'measures', 'ratings'] as const) {
      await idb.clear(s)
    }
  },
}

/** Données de démonstration (version web). */
async function seedWebDemo(): Promise<void> {
  const ts = now()
  const profile: Profile = {
    id: PROFILE_KEY,
    name: 'Démo',
    age: 32,
    sex: 'homme',
    heightCm: 182,
    weightKg: 73,
    targetWeightKg: 74,
    level: 'intermediaire',
    practiceMonths: 36,
    weeklyFrequency: 4,
    job: 'moderement-active',
    sleepHours: 7,
    habitualFatigue: 4,
    recoveryQuality: 6,
    maxSessionMinutes: 75,
    gymName: 'Salle de démo',
    availableEquipment: ['machine-guidee', 'poulie', 'halteres', 'barre', 'banc', 'presse-cuisses', 'hack-squat', 'tapis', 'velo'],
    updatedAt: ts,
  }
  await idb.put('profile', PROFILE_KEY, profile)

  await idb.put('limitations', 'demo-coude', {
    id: 'demo-coude',
    kind: 'coude',
    side: 'droite',
    intensity: 4,
    chronic: true,
    painAtRest: false,
    painDuringMovement: true,
    active: true,
    createdAt: ts,
    updatedAt: ts,
  } satisfies Limitation)

  const config: ProgramConfig = {
    name: 'Programme de démonstration',
    primaryObjective: 'recomposition',
    secondaryObjectives: ['hypertrophie'],
    weeks: 12,
    sessionsPerWeek: 4,
    trainingDays: [1, 2, 4, 5],
    maxSessionMinutes: 75,
    restBetweenSetsSec: 90,
    maxExercisesPerSession: 6,
    location: 'salle',
    availableEquipment: profile.availableEquipment,
    musclePriorities: { dos: 'elevee', epaules: 'elevee' },
    cardio: { enabled: true, modes: ['velo'], placement: 'apres', frequencyPerWeek: 2, durationMin: 15, intensity: 'leger', prioritizeRecovery: true },
    finishers: ['gainage-frontal', 'dead-bug'],
  }
  const program = generateProgram({
    config,
    level: profile.level,
    catalog: await idb.getAll<Exercise>('exercises'),
    limitations: await idb.getAll<Limitation>('limitations'),
    makeId: () => uuid(),
    now: ts,
  })
  program.status = 'actif'
  await idb.put('programs', program.id, program)

  const firstThree = program.sessions.filter((s) => s.weekIndex === 0).slice(0, 3)
  for (let i = 0; i < firstThree.length; i++) {
    const ps = firstThree[i]
    const date = new Date(Date.now() - (3 - i) * 86400000).toISOString().slice(0, 10)
    const log: SessionLog = {
      id: uuid(),
      programId: program.id,
      plannedSessionId: ps.id,
      date,
      status: 'terminee',
      durationMin: 68,
      exercises: ps.exercises
        .filter((e) => !e.isCardio && !e.isFinisher)
        .map((pe) => ({
          id: uuid(),
          plannedExerciseId: pe.id,
          exerciseId: pe.exerciseId,
          completed: true,
          replaced: false,
          sets: Array.from({ length: pe.sets }, (_, k) => ({ id: uuid(), setIndex: k, loadKg: 30 + i * 2.5, reps: 10, rpe: 8, rir: 2, done: true })),
        })),
      createdAt: ts,
      updatedAt: ts,
    }
    await idb.put('sessions', log.id, log)
  }
}
