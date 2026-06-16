import type { ExperienceLevel, MuscleGroup, Objective, Priority } from '../../types/common'
import type { MusclePriorities } from '../../types/profile'

/**
 * Volume hebdomadaire cible (nombre de séries par muscle et par semaine).
 * Fondé sur les repères usuels de programmation : le volume optimal augmente
 * avec le niveau, l'hypertrophie demande plus de volume que la force/maintien.
 */
const BASE_WEEKLY_SETS: Record<ExperienceLevel, number> = {
  debutant: 10,
  intermediaire: 14,
  confirme: 18,
}

const OBJECTIVE_FACTOR: Partial<Record<Objective, number>> = {
  hypertrophie: 1.1,
  'prise-de-masse': 1.1,
  recomposition: 1.0,
  maintien: 0.7,
  force: 0.85,
  'perte-de-gras': 0.95,
  'perte-de-poids': 0.85,
  'condition-physique': 0.8,
  reprise: 0.6,
}

const PRIORITY_FACTOR: Record<Priority, number> = {
  faible: 0.7,
  normale: 1,
  elevee: 1.35,
}

/** Plancher de volume pour ne pas négliger un muscle non prioritaire. */
const MIN_SETS = 4
/** Plafond de sécurité par muscle et par semaine. */
const MAX_SETS = 24

/**
 * Calcule le volume hebdomadaire cible par muscle.
 * Les muscles non listés dans priorities reçoivent la priorité "normale".
 */
export function weeklySetTargets(
  level: ExperienceLevel,
  objective: Objective,
  priorities: MusclePriorities,
  muscles: MuscleGroup[],
): Record<string, number> {
  const base = BASE_WEEKLY_SETS[level] * (OBJECTIVE_FACTOR[objective] ?? 1)
  const out: Record<string, number> = {}
  for (const m of muscles) {
    const prio = priorities[m] ?? 'normale'
    const sets = Math.round(base * PRIORITY_FACTOR[prio])
    out[m] = Math.min(MAX_SETS, Math.max(MIN_SETS, sets))
  }
  return out
}
