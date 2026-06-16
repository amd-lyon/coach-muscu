import type { Equipment, MuscleGroup, Objective, SplitType } from './common'
import type { MusclePriorities } from './profile'

/** Préférences cardio (étape 5 de l'assistant). */
export interface CardioConfig {
  enabled: boolean
  modes: Equipment[] // tapis, velo, rameur...
  placement: 'avant' | 'apres' | 'jour-separe' | 'recuperation'
  frequencyPerWeek: number
  durationMin: number
  intensity: 'leger' | 'modere' | 'soutenu'
  targetHr?: number
  prioritizeRecovery: boolean
}

/** Exercices de fin de séance optionnels (étape 6). */
export type FinisherKind =
  | 'abdominaux'
  | 'gainage-frontal'
  | 'gainage-lateral'
  | 'planche'
  | 'dead-bug'
  | 'bird-dog'
  | 'mobilite'
  | 'etirements'
  | 'respiration'
  | 'retour-au-calme'
  | 'posture'

/**
 * Configuration complète issue de l'assistant de création.
 * C'est l'unique entrée du générateur de programme.
 */
export interface ProgramConfig {
  name: string
  primaryObjective: Objective
  secondaryObjectives: Objective[]
  weeks: number // 12 par défaut
  sessionsPerWeek: 2 | 3 | 4 | 5 | 6
  trainingDays: number[] // 0=dim ... 6=sam
  maxSessionMinutes: number
  restBetweenSetsSec: number
  maxExercisesPerSession: number
  location: 'salle' | 'maison' | 'mixte'
  availableEquipment: Equipment[]
  musclePriorities: MusclePriorities
  cardio: CardioConfig
  finishers: FinisherKind[]
  /** Split imposé manuellement, sinon choisi automatiquement. */
  preferredSplit?: SplitType
}

/** Une série prescrite pour un exercice planifié. */
export interface PrescribedSet {
  reps: string // ex. "8-12" ou "10"
  targetRpe?: number
  targetRir?: number
  /** Charge conseillée en kg (optionnelle tant qu'aucune calibration). */
  suggestedLoadKg?: number
}

/** Un exercice tel que planifié dans une séance. */
export interface PlannedExercise {
  id: string
  exerciseId: string
  order: number
  sets: number
  prescribedSet: PrescribedSet
  restSec: number
  tempo?: string
  notes?: string
  /** Verrouillé = exclu du remplacement automatique. */
  locked: boolean
  /** Alternatives proposées (ids), classées par pertinence. */
  alternativeIds: string[]
  /** Renseigné si l'exercice a été adapté/remplacé pour cause de douleur. */
  adaptationReason?: string
  isFinisher?: boolean
  isCardio?: boolean
}

export type SessionFocus =
  | 'full-body'
  | 'upper'
  | 'lower'
  | 'push'
  | 'pull'
  | 'legs'
  | 'cardio'
  | 'recuperation'

/** Séance planifiée dans une semaine. */
export interface PlannedSession {
  id: string
  weekIndex: number // 0..weeks-1
  dayOfWeek: number // 0..6
  order: number
  name: string
  focus: SessionFocus
  targetMuscles: MuscleGroup[]
  estimatedMinutes: number
  warmup: string[]
  exercises: PlannedExercise[]
  cooldown: string[]
}

/** Type de bloc de périodisation pour une semaine. */
export type WeekBlock = 'prise-en-main' | 'progression' | 'delestage' | 'consolidation' | 'bilan'

export interface ProgramWeek {
  index: number
  block: WeekBlock
  label: string
  /** Multiplicateurs appliqués au volume/intensité de base. */
  volumeMultiplier: number
  intensityMultiplier: number
  note: string
}

export type ProgramStatus = 'brouillon' | 'actif' | 'termine' | 'archive'

/** Programme complet sur N semaines. */
export interface Program {
  id: string
  name: string
  status: ProgramStatus
  config: ProgramConfig
  split: SplitType
  weeks: ProgramWeek[]
  sessions: PlannedSession[]
  /** Justifications globales produites par le générateur (traçabilité). */
  rationale: string[]
  createdAt: string
  updatedAt: string
}
