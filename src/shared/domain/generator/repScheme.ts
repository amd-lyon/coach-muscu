import type { MovementType, Objective } from '../../types/common'

export interface RepScheme {
  reps: string
  targetRpe: number
  targetRir: number
  restSec: number
  setsPerExercise: number
}

/**
 * Schéma de répétitions / RPE / repos dérivé de l'objectif principal.
 * Les valeurs sont des points de départ raisonnables, modulés ensuite par
 * la périodisation et le type de mouvement.
 */
export function repSchemeFor(objective: Objective, movement: MovementType): RepScheme {
  // Base par objectif (orientée mouvement polyarticulaire).
  let base: RepScheme
  switch (objective) {
    case 'force':
      base = { reps: '3-6', targetRpe: 8, targetRir: 2, restSec: 180, setsPerExercise: 4 }
      break
    case 'prise-de-masse':
    case 'hypertrophie':
      base = { reps: '6-12', targetRpe: 8, targetRir: 2, restSec: 120, setsPerExercise: 4 }
      break
    case 'recomposition':
    case 'maintien':
      base = { reps: '8-12', targetRpe: 8, targetRir: 2, restSec: 90, setsPerExercise: 3 }
      break
    case 'perte-de-gras':
    case 'perte-de-poids':
      base = { reps: '10-15', targetRpe: 8, targetRir: 2, restSec: 75, setsPerExercise: 3 }
      break
    case 'condition-physique':
      base = { reps: '12-15', targetRpe: 7, targetRir: 3, restSec: 60, setsPerExercise: 3 }
      break
    case 'reprise':
      base = { reps: '10-15', targetRpe: 6, targetRir: 4, restSec: 90, setsPerExercise: 2 }
      break
    default:
      base = { reps: '8-12', targetRpe: 8, targetRir: 2, restSec: 90, setsPerExercise: 3 }
  }

  // L'isolation se travaille en reps plus élevées / repos plus courts.
  if (movement === 'isolation') {
    return {
      ...base,
      reps: bumpReps(base.reps),
      restSec: Math.max(45, base.restSec - 45),
      setsPerExercise: Math.max(2, base.setsPerExercise - 1),
    }
  }
  return base
}

/** Décale une fourchette de reps vers le haut (pour l'isolation). */
function bumpReps(range: string): string {
  const m = range.match(/(\d+)-(\d+)/)
  if (!m) return range
  const lo = Number(m[1]) + 2
  const hi = Number(m[2]) + 3
  return `${lo}-${hi}`
}
