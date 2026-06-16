import type { ActivityLevel, Equipment, ExperienceLevel, MuscleGroup, Priority } from './common'

export type Sex = 'homme' | 'femme' | 'non-precise'

/** Profil physique et sportif de l'utilisateur. */
export interface Profile {
  id: string
  name: string
  age?: number
  sex: Sex
  heightCm?: number
  weightKg?: number
  targetWeightKg?: number
  level: ExperienceLevel
  practiceMonths?: number
  weeklyFrequency?: number
  dailySteps?: number
  job: ActivityLevel
  sleepHours?: number
  habitualFatigue?: number // 0-10
  recoveryQuality?: number // 0-10
  maxSessionMinutes?: number
  gymName?: string
  /** Équipements disponibles dans la salle/à la maison. */
  availableEquipment: Equipment[]
  updatedAt: string
}

/** Préférence de priorité par groupe musculaire (étape 4 de l'assistant). */
export type MusclePriorities = Partial<Record<MuscleGroup, Priority>>
