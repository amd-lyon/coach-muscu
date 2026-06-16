import type { Limitation } from './pain'

/** État du jour rempli avant une séance (étape "feu de séance"). */
export interface DailyState {
  id: string
  date: string // ISO yyyy-mm-dd
  energy: number // 0-10
  fatigue: number // 0-10
  sleep: number // 0-10
  stress: number // 0-10
  motivation: number // 0-10
  soreness: number // 0-10
  availableMinutes?: number
  /** Limitations actives ce jour (copie légère des kinds + intensité). */
  activeLimitations: Array<Pick<Limitation, 'kind' | 'side' | 'intensity'>>
  createdAt: string
}

export type SessionLight = 'vert' | 'orange' | 'rouge'

/** Résultat de l'évaluation de l'état du jour. */
export interface ReadinessResult {
  light: SessionLight
  score: number // 0-100
  reasons: string[]
  recommendation: string
  /** Ajustements suggérés à la séance du jour. */
  adjustments: {
    volumeMultiplier: number
    intensityMultiplier: number
    dropToRecovery: boolean
  }
}

/** Une série réellement effectuée. */
export interface SetLog {
  id: string
  setIndex: number
  loadKg?: number
  reps?: number
  rpe?: number
  rir?: number
  restSec?: number
  painBefore?: number // 0-10
  painDuring?: number
  painAfter?: number
  movementQuality?: number // 0-5
  done: boolean
  comment?: string
}

/** Journal d'un exercice réalisé pendant une séance. */
export interface ExerciseLog {
  id: string
  plannedExerciseId?: string
  exerciseId: string
  sets: SetLog[]
  completed: boolean
  replaced: boolean
  replacedByExerciseId?: string
  comment?: string
}

export type SessionLogStatus = 'en-cours' | 'terminee' | 'abandonnee'

/** Séance réalisée (instance d'une PlannedSession). */
export interface SessionLog {
  id: string
  programId: string
  plannedSessionId?: string
  date: string
  status: SessionLogStatus
  readiness?: ReadinessResult
  exercises: ExerciseLog[]
  durationMin?: number
  globalComment?: string
  createdAt: string
  updatedAt: string
}

/** Mesure corporelle ponctuelle. */
export interface BodyMeasure {
  id: string
  date: string
  weightKg?: number
  waistCm?: number
  chestCm?: number
  armCm?: number
  thighCm?: number
  hipCm?: number
  bodyFatPct?: number
  photoPaths?: string[]
  notes?: string
}
